/// <reference path="../../pb_data/types.d.ts" />

// RÝNI — per-site statistics handler. Registered by stats.pb.js.
//
//   GET /api/ryni/sites/{siteId}/stats?from=<ISO>&to=<ISO>
//
// Server-side aggregation over the site's `records` (never pulled to the
// frontend). Folds all rows for the site in JS — fine at self-host scale,
// mirrors STJÓRNA's stats approach.

var http = require(`${__hooks}/lib/http.js`);
var access = require(`${__hooks}/lib/access.js`);
var getR = http.getR;
var toMs = http.toMs;

var SESSION_GAP_MS = 30 * 60 * 1000; // 30 min idle → new session
var LIVE_WINDOW_MS = 5 * 60 * 1000; // current visitors window (default 5 min)

function fail(e, status, message) {
    http.replyError(e, status, message);
}

function str(r, k) {
    return String(getR(r, k) || '');
}

function dayKey(ms) {
    return new Date(ms).toISOString().slice(0, 10);
}

function statsHandler(e) {
    if (!e.auth) return fail(e, 401, 'unauthorized');
    if (!e.hasSuperuserAuth() && !e.auth.id) return fail(e, 401, 'unrecognized token type');

    var siteId = String(e.request.pathValue('siteId') || '').trim();
    if (!siteId) return fail(e, 400, 'siteId is required');

    var role = 'manager';
    if (!e.hasSuperuserAuth()) {
        role = access.siteRole($app, String(e.auth.id || ''), siteId);
        if (!role) return fail(e, 403, 'not a member of this site');
    }

    var site = null;
    try {
        site = $app.findRecordById('sites', siteId);
    } catch (_) {
        return fail(e, 404, 'site not found');
    }

    var fromMs = toMs(e.request.url.query().get('from') || '');
    var toMsRaw = toMs(e.request.url.query().get('to') || '');
    var toMsEnd = toMsRaw || Date.now();

    var rows = [];
    try {
        rows = $app.findRecordsByFilter('records', 'site={:s}', '-created', 0, 0, { s: siteId }) || [];
    } catch (_err) {
        rows = [];
    }

    var inRange = [];
    for (var i = 0; i < rows.length; i++) {
        var ts = toMs(getR(rows[i], 'created'));
        if (fromMs && ts < fromMs) continue;
        if (ts > toMsEnd) continue;
        inRange.push(rows[i]);
    }

    // --- core counts -------------------------------------------------------
    var views = inRange.length;
    var visitorSet = {};
    var newVisitors = 0;
    var durSum = 0;
    var durCount = 0;
    var byVisitor = {};
    var byDay = {};
    var referrers = {};
    var browsers = {};
    var oses = {};
    var devices = {};
    var screens = {};
    var pages = {};

    for (var j = 0; j < inRange.length; j++) {
        var r = inRange[j];
        var vid = str(r, 'visitor_id');
        var ts2 = toMs(getR(r, 'created'));

        if (!visitorSet[vid]) {
            visitorSet[vid] = true;
        }
        if (getR(r, 'is_new_visitor')) newVisitors++;

        var d = Number(getR(r, 'duration') || 0) || 0;
        if (d > 0) {
            durSum += d;
            durCount++;
        }

        (byVisitor[vid] || (byVisitor[vid] = [])).push(ts2);

        var day = dayKey(ts2);
        if (!byDay[day]) byDay[day] = { views: 0, uniqueVisitors: 0, seen: {} };
        byDay[day].views++;
        if (!byDay[day].seen[vid]) {
            byDay[day].seen[vid] = true;
            byDay[day].uniqueVisitors++;
        }

        tally(referrers, str(r, 'referrer'));
        tally(browsers, str(r, 'browser'));
        tally(oses, str(r, 'os'));
        tally(devices, str(r, 'device'));
        tally(screens, str(r, 'screen_size'));
        tally(pages, str(r, 'path'));
    }

    var uniqueVisitors = Object.keys(visitorSet).length;
    var avgDuration = durCount > 0 ? Math.round(durSum / durCount) : 0;

    // --- sessions / bounce -------------------------------------------------
    var sessions = 0;
    var bounces = 0;
    for (var vk in byVisitor) {
        if (!Object.prototype.hasOwnProperty.call(byVisitor, vk)) continue;
        var arr = byVisitor[vk];
        arr.sort(function (a, b) {
            return a - b;
        });
        var sv = 0;
        var prev = -1;
        for (var si = 0; si < arr.length; si++) {
            var t = arr[si];
            if (prev >= 0 && t - prev > SESSION_GAP_MS) {
                if (sv === 1) bounces++;
                sessions++;
                sv = 0;
            }
            sv++;
            prev = t;
        }
        if (sv > 0) {
            if (sv === 1) bounces++;
            sessions++;
        }
    }
    var bounceRate = sessions > 0 ? bounces / sessions : 0;

    // --- series (per day) --------------------------------------------------
    var days = Object.keys(byDay);
    days.sort();
    var series = days.map(function (dkey) {
        return {
            date: dkey,
            views: byDay[dkey].views,
            uniqueVisitors: byDay[dkey].uniqueVisitors,
        };
    });

    // --- current visitors (live) ------------------------------------------
    var cutoff = Date.now() - LIVE_WINDOW_MS;
    var liveRows = [];
    try {
        liveRows = $app.findRecordsByFilter('heartbeats', 'site={:s}', '', 0, 0, { s: siteId }) || [];
    } catch (_e2) {
        liveRows = [];
    }
    var currentVisitors = 0;
    for (var li = 0; li < liveRows.length; li++) {
        var ls = toMs(getR(liveRows[li], 'last_seen'));
        if (ls >= cutoff) currentVisitors++;
    }

    http.reply(e, 200, {
        views: views,
        uniqueVisitors: uniqueVisitors,
        newVisitors: newVisitors,
        avgDuration: avgDuration,
        bounceRate: bounceRate,
        currentVisitors: currentVisitors,
        series: series,
        referrers: topN(referrers),
        browsers: topN(browsers),
        os: topN(oses),
        devices: topN(devices),
        screens: topN(screens),
        pages: topN(pages),
    });
}

function tally(map, value) {
    value = (value || '').trim();
    if (!value) return;
    map[value] = (map[value] || 0) + 1;
}

function topN(map) {
    var keys = Object.keys(map);
    keys.sort(function (a, b) {
        return map[b] - map[a];
    });
    var out = [];
    for (var i = 0; i < keys.length && i < 10; i++) {
        out.push({ value: keys[i], count: map[keys[i]] });
    }
    return out;
}

module.exports = { statsHandler: statsHandler };
