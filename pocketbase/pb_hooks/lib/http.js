/// <reference path="../../pb_data/types.d.ts" />

// RÝNI — shared helpers for custom route handlers.
//
// CommonJS module, require()d INSIDE handlers:
//     require(`${__hooks}/lib/http.js`)
// PocketBase runs each handler in an executor VM that does not see the
// top-level variables of the *.pb.js file that registered it.

function reply(e, status, obj) {
    var body = JSON.stringify(obj);
    e.response.header().set('Content-Type', 'application/json; charset=utf-8');
    e.response.header().set('Cache-Control', 'no-store');
    e.string(status, body);
}

function replyError(e, status, message) {
    reply(e, status, { ok: false, error: { code: status, message: message } });
}

// Safe record.get — null for missing fields or odd rows.
function getR(r, k) {
    try {
        if (r && typeof r.get === 'function') return r.get(k);
    } catch (_e) {}
    return null;
}

// Normalise a PB date value to epoch ms (0 when unparseable). goja hands out
// either a Date-like object or a "YYYY-MM-DD HH:MM:SS.sssZ" string.
function toMs(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && typeof v.getTime === 'function') {
        var g = v.getTime();
        return isNaN(g) ? 0 : g;
    }
    var p = Date.parse(String(v).replace(' ', 'T'));
    return isNaN(p) ? 0 : p;
}

module.exports = { reply: reply, replyError: replyError, getR: getR, toMs: toMs };
