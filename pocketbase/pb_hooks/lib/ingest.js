/// <reference path="../../pb_data/types.d.ts" />

// RÝNI — anonymous tracking ingest.
//
// Loaded via require() inside the route handler (loader/executor VM split).
// Route: POST /t/{slug}
//
// Privacy + design notes:
//   - Anonymous: no auth middleware. Drops unknown slugs with 404 and no
//     record, so adblock testers probing endpoints can't fingerprint a site.
//   - Variant A (cross-origin): enforces the site's `allowed_origins` and
//     echoes `Access-Control-Allow-Origin`. Variant B (same-origin proxy)
//     sends no `Origin` header and is gated on the browser's `Sec-Fetch-Site`
//     signal so non-browser clients (curl/wget) can't poison the data.
//   - Stores only the fields the client sends: a random visitor id, page,
//     referrer, UA-derived browser/os/device, screen size, duration. No IP,
//     no cookie.

function reply(e, status, obj) {
    var body = JSON.stringify(obj || {});
    e.response.header().set('Content-Type', 'application/json; charset=utf-8');
    e.response.header().set('Cache-Control', 'no-store');
    e.string(status, body);
}

// Fire-and-forget success. The tracker posts via navigator.sendBeacon()
// (a no-cors cross-origin request) and never reads the response, so we
// return an empty 204 instead of a JSON body. A JSON response to a no-cors
// request is "blockable" under Chrome's Opaque Response Blocking (ORB) and
// would surface as ERR_BLOCKED_BY_ORB on the client site. No body → nothing
// for ORB to block.
function noContent(e) {
    e.response.header().set('Cache-Control', 'no-store');
    e.noContent(204);
}

function readJsonBody(e) {
    try {
        return JSON.parse(readerToString(e.request.body, 64 * 1024) || '{}') || {};
    } catch (_) {
        return {};
    }
}

function str(v, max) {
    return String(v || '').slice(0, max);
}

// Decode a Go []byte (array of ints) or string to a UTF-8 string. JSONField
// values surface as byte arrays in the JSVM; origins are ASCII URLs.
function bytesToUtf8(b) {
    if (!b) return '';
    if (typeof b === 'string') return b;
    var out = '';
    for (var i = 0; i < b.length; i++) {
        out += String.fromCharCode(b[i] & 0xFF);
    }
    return out;
}

// True when this (site, visitor) has never produced a record before.
function isNewVisitor(siteId, visitor) {
    try {
        var rows = $app.findRecordsByFilter('records', 'site={:s} && visitor_id={:v}', '', 1, 0, {
            s: siteId,
            v: visitor,
        });
        return !(rows && rows.length > 0);
    } catch (_) {
        return true;
    }
}

function upsertHeartbeat(siteId, visitor) {
    var now = new Date().toISOString();
    try {
        var hb = $app.findFirstRecordByFilter('heartbeats', 'site={:s} && visitor_id={:v}', {
            s: siteId,
            v: visitor,
        });
        hb.set('last_seen', now);
        $app.save(hb);
    } catch (_) {
        try {
            var hb2 = new Record($app.findCollectionByNameOrId('heartbeats'));
            hb2.set('site', siteId);
            hb2.set('visitor_id', visitor);
            hb2.set('last_seen', now);
            $app.save(hb2);
        } catch (_e) {}
    }
}

function removeHeartbeat(siteId, visitor) {
    try {
        var hb = $app.findFirstRecordByFilter('heartbeats', 'site={:s} && visitor_id={:v}', {
            s: siteId,
            v: visitor,
        });
        $app.delete(hb);
    } catch (_) {}
}

// Set `duration` on the most recent null-duration record for (site, visitor).
function applyDuration(siteId, visitor, duration) {
    if (!duration || duration <= 0) return;
    try {
        var rows = $app.findRecordsByFilter(
            'records',
            'site={:s} && visitor_id={:v}',
            '-created',
            3,
            0,
            { s: siteId, v: visitor },
        );
        for (var i = 0; i < rows.length; i++) {
            var d = rows[i].get('duration');
            // goja hands back 0 (or null/'') for an unset number; a real
            // duration is always > 0.
            if (!(d > 0)) {
                rows[i].set('duration', duration);
                $app.save(rows[i]);
                return;
            }
        }
    } catch (_) {}
}

function handler(e) {
    var slug = str(e.request.pathValue('slug'), 100);
    var origin = '';
    try {
        origin = str(e.request.header.get('Origin'), 2000);
    } catch (_) {}

    var site = null;
    try {
        site = $app.findFirstRecordByFilter('sites', 'endpoint_slug={:s} || tracking_id={:s}', { s: slug });
    } catch (_) {}

    if (!site) {
        e.response.header().set('Cache-Control', 'no-store');
        e.string(404, '{}');
        return;
    }

    // Variant A: cross-origin browser requests carry an `Origin` header —
    // enforce the site's allowed_origins. Variant B (same-origin proxy)
    // carries no `Origin`, so gate it on the browser's Sec-Fetch-Site signal.
    // CORS itself is handled by PB's default `Access-Control-Allow-Origin: *`;
    // these 403s are the real security boundary (the response carries no data).
    if (origin) {
        var allowed = [];
        try {
            var raw = site.get('allowed_origins');
            // JSONField values surface as a Go []byte (array of ints) in the
            // JSVM — decode to a string, then JSON.parse.
            allowed = JSON.parse(bytesToUtf8(raw) || '[]') || [];
        } catch (_) {}
        if (allowed.indexOf(origin) === -1) {
            reply(e, 403, { ok: false });
            return;
        }
    } else {
        // Variant B: the browser posts to its own origin, which proxies here.
        // A real browser beacon carries `Sec-Fetch-Site: same-origin` (or
        // `same-site` for a subdomain proxy). curl/wget send neither — reject
        // them so the anonymous ingest can't be trivially poisoned.
        //
        // This is a best-effort browser signal (a determined client can spoof
        // the header), layered with the rate limiter — not a cryptographic
        // boundary. For a hard boundary, put Rýni behind your own auth.
        var fetchSite = '';
        try {
            fetchSite = str(e.request.header.get('Sec-Fetch-Site'), 100);
        } catch (_) {}
        if (fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
            reply(e, 403, { ok: false });
            return;
        }
    }

    var body = readJsonBody(e);
    var visitor = str(body.visitor, 100);
    if (!visitor) {
        reply(e, 400, { ok: false, error: 'missing visitor' });
        return;
    }
    var type = str(body.type, 20) || 'view';
    var siteId = site.id;

    if (type === 'heartbeat') {
        upsertHeartbeat(siteId, visitor);
        noContent(e);
        return;
    }

    if (type === 'end') {
        applyDuration(siteId, visitor, Number(body.duration) || 0);
        removeHeartbeat(siteId, visitor);
        noContent(e);
        return;
    }

    // Default "view": create a record; apply any carried duration to the
    // previous null-duration record first.
    var duration = Number(body.duration);
    if (!isNaN(duration) && duration > 0) {
        applyDuration(siteId, visitor, duration);
    }

    var rec = new Record($app.findCollectionByNameOrId('records'));
    rec.set('created', new Date().toISOString());
    rec.set('site', siteId);
    rec.set('visitor_id', visitor);
    rec.set('path', str(body.page, 1000));
    rec.set('referrer', str(body.referrer, 2000));
    rec.set('browser', str(body.browser, 100));
    rec.set('os', str(body.os, 100));
    rec.set('device', str(body.device, 100));
    rec.set('screen_size', str(body.screen, 50));
    rec.set('is_new_visitor', isNewVisitor(siteId, visitor));
    $app.save(rec);

    upsertHeartbeat(siteId, visitor);
    noContent(e);
}

module.exports = { handler: handler };
