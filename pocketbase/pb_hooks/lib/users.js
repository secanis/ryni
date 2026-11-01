/// <reference path="../../pb_data/types.d.ts" />

// RÝNI — user search, used by the share dialog to resolve an email to a
// user id (the `users` collection is self-only to regular users).

var http = require(`${__hooks}/lib/http.js`);

function handler(e) {
    if (!e.auth) return http.replyError(e, 401, 'unauthorized');

    var q = String(e.request.url.query().get('q') || '').trim();
    if (!q) return http.reply(e, 200, { users: [] });

    var rows = [];
    try {
        rows = $app.findRecordsByFilter('users', 'email ~ {:q} || name ~ {:q}', '', 10, 0, { q: q }) || [];
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
