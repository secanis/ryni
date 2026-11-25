/// <reference path="../../pb_data/types.d.ts" />

// RÝNI — per-site raw pageview export. Registered by export.pb.js.
//
//   GET /api/ryni/sites/{siteId}/export?from=<ISO>&to=<ISO>
//
// Returns every pageview record in the range, oldest first, with all stored
// fields except `visitor_id`. The frontend turns the payload into CSV or JSON;
// keeping one response shape means the format helpers stay unit-testable.

var http = require(`${__hooks}/lib/http.js`);
var access = require(`${__hooks}/lib/access.js`);
var getR = http.getR;
var toMs = http.toMs;

var TEXT_FIELDS = [
    'path',
    'title',
    'referrer',
    'browser',
    'os',
    'device',
    'screen_size',
    'language',
    'timezone',
    'utm_source',
    'utm_medium',
    'utm_campaign',
];

function fail(e, status, message) {
    http.replyError(e, status, message);
}

function iso(ms) {
    return ms ? new Date(ms).toISOString() : '';
}

function exportRow(r) {
    var row = { created: iso(toMs(getR(r, 'created'))) };
    for (var i = 0; i < TEXT_FIELDS.length; i++) {
        var key = TEXT_FIELDS[i];
        row[key] = String(getR(r, key) || '');
    }
    row.duration = Number(getR(r, 'duration')) || 0;
    row.is_new_visitor = !!getR(r, 'is_new_visitor');
    return row;
}

function exportHandler(e) {
    if (!e.auth) return fail(e, 401, 'unauthorized');
    if (!e.hasSuperuserAuth() && !e.auth.id) return fail(e, 401, 'unrecognized token type');

    var siteId = String(e.request.pathValue('siteId') || '').trim();
    if (!siteId) return fail(e, 400, 'siteId is required');

    if (!e.hasSuperuserAuth()) {
        var role = access.siteRole($app, String(e.auth.id || ''), siteId);
        if (!role) return fail(e, 403, 'not a member of this site');
    }

    var site = null;
    try {
        site = $app.findRecordById('sites', siteId);
    } catch (_) {
        return fail(e, 404, 'site not found');
    }

    var fromMs = toMs(e.request.url.query().get('from') || '');
    var toMsEnd = toMs(e.request.url.query().get('to') || '');
    if (!fromMs || !toMsEnd) return fail(e, 400, 'from and to are required');

    var rows = [];
    try {
        rows = $app.findRecordsByFilter('records', 'site={:s}', 'created', 0, 0, { s: siteId }) || [];
    } catch (_err) {
        rows = [];
    }

    var records = [];
    for (var i = 0; i < rows.length; i++) {
        var ts = toMs(getR(rows[i], 'created'));
        if (ts < fromMs || ts > toMsEnd) continue;
        records.push(exportRow(rows[i]));
    }

    http.reply(e, 200, {
        site: {
            id: site.id,
            name: String(getR(site, 'name') || ''),
            tracking_id: String(getR(site, 'tracking_id') || ''),
        },
        from: iso(fromMs),
        to: iso(toMsEnd),
        exportedAt: new Date().toISOString(),
        records: records,
    });
}

module.exports = { exportHandler: exportHandler };
