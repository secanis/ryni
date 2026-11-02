/// <reference path="../../pb_data/types.d.ts" />

// RÝNI — user search, used by the share dialog to resolve an email to a
// user id (the `users` collection is self-only to regular users).
//
// Security: only superusers and site managers may resolve users, and the
// lookup is EXACT-match (email or name). A plain viewer / unauthenticated
// caller gets a 403 — this prevents low-privilege users from enumerating the
// whole user directory via prefix/substring search.

var http = require(`${__hooks}/lib/http.js`);

// True when `uid` is a manager of at least one site (creator counts).
// `managers` is a multi-select relation → `~` (containment), `created_by`
// is a plain text marker → `=` (matches the `sites` collection rules).
function isManagerOfAnySite(uid) {
    try {
        var rows = $app.findRecordsByFilter(
            'sites',
            'managers ~ {:uid} || created_by = {:uid}',
            '',
            1,
            0,
            { uid: uid },
        );
        return !!(rows && rows.length > 0);
    } catch (_) {
        return false;
    }
}

function handler(e) {
    if (!e.auth) return http.replyError(e, 401, 'unauthorized');

    var isSuper = typeof e.hasSuperuserAuth === 'function' ? e.hasSuperuserAuth() : false;
    if (!isSuper) {
        var uid = String(e.auth.id || '');
        if (!uid || !isManagerOfAnySite(uid)) {
            return http.replyError(e, 403, 'forbidden');
        }
    }

    var q = String(e.request.url.query().get('q') || '').trim();
    if (!q) return http.reply(e, 200, { users: [] });

    var rows = [];
    try {
        // Exact match only — no prefix/substring search (prevents enumeration).
        rows = $app.findRecordsByFilter('users', 'email = {:q} || name = {:q}', '', 10, 0, { q: q }) || [];
    } catch (_) {
        rows = [];
    }

    var out = [];
    for (var i = 0; i < rows.length; i++) {
        out.push({
            id: rows[i].id,
            email: String(http.getR(rows[i], 'email') || ''),
            name: String(http.getR(rows[i], 'name') || ''),
        });
    }

    http.reply(e, 200, { users: out });
}

module.exports = { handler: handler };
