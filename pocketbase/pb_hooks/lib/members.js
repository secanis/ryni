/// <reference path="../../pb_data/types.d.ts" />

// RÝNI — per-site members handler. Registered by members.pb.js.
//
//   GET /api/ryni/sites/{siteId}/members
//
// Resolves a site's `managers`/`viewers` relation ids to { id, email, name }
// so the dashboard can render member badges. The `users` collection is
// self-only to regular users, so the frontend can't expand the relations
// directly; this route reads them server-side via $app (bypassing rules).

var http = require(`${__hooks}/lib/http.js`);
var access = require(`${__hooks}/lib/access.js`);

// Normalise a relation value (single string, multi array, or a goja
// []interface{} of ids/records) into a list of id strings.
function asIdList(v) {
    if (v == null || v === '') return [];
    var out = [];
    function push(x) {
        if (x == null || x === '') return;
        if (typeof x === 'object') {
            if (x.id) out.push(String(x.id));
        } else {
            out.push(String(x));
        }
    }
    if (v.length !== undefined) {
        for (var i = 0; i < v.length; i++) push(v[i]);
    } else {
        push(v);
    }
    return out;
}

function member(app, id) {
    var rec = null;
    try {
        rec = app.findRecordById('users', id);
    } catch (_) {
        return null;
    }
    if (!rec) return null;
    return {
        id: id,
        email: String(http.getR(rec, 'email') || ''),
        name: String(http.getR(rec, 'name') || ''),
    };
}

function membersHandler(e) {
    if (!e.auth) return http.replyError(e, 401, 'unauthorized');
    if (!e.hasSuperuserAuth() && !e.auth.id) return http.replyError(e, 401, 'unrecognized token type');

    var siteId = String(e.request.pathValue('siteId') || '').trim();
    if (!siteId) return http.replyError(e, 400, 'siteId is required');

    if (!e.hasSuperuserAuth()) {
        var role = access.siteRole($app, String(e.auth.id || ''), siteId);
        if (!role) return http.replyError(e, 403, 'not a member of this site');
    }

    var site = null;
    try {
        site = $app.findRecordById('sites', siteId);
    } catch (_) {
        return http.replyError(e, 404, 'site not found');
    }

    var managers = asIdList(http.getR(site, 'managers'));
    var viewers = asIdList(http.getR(site, 'viewers'));

    var seen = {};
    var outManagers = [];
    var outViewers = [];

    for (var i = 0; i < managers.length; i++) {
        if (seen[managers[i]]) continue;
        seen[managers[i]] = true;
        var m = member($app, managers[i]);
        if (m) outManagers.push(m);
    }
    for (var j = 0; j < viewers.length; j++) {
        if (seen[viewers[j]]) continue;
        seen[viewers[j]] = true;
        var v = member($app, viewers[j]);
        if (v) outViewers.push(v);
    }

    http.reply(e, 200, { managers: outManagers, viewers: outViewers });
}

module.exports = { membersHandler: membersHandler };
