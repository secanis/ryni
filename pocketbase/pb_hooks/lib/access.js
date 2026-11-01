/// <reference path="../../pb_data/types.d.ts" />

// RÝNI — per-site access helpers.

// True when a relation field (single string or multi array) contains `id`.
function inRelation(record, field, id) {
    try {
        var v = record.get(field);
        if (v == null || v === '') return false;
        if (typeof v === 'string') return v === id;
        if (v.length !== undefined) {
            for (var i = 0; i < v.length; i++) {
                if (String(v[i]) === id) return true;
            }
            return false;
        }
        return String(v) === id;
    } catch (_) {
        return false;
    }
}

// Resolve a user's role on a site: "manager" | "viewer" | null.
// Permissions are denormalised onto `sites` as `managers`/`viewers` relations.
function siteRole(app, userId, siteId) {
    if (!userId || !siteId) return null;
    var site = null;
    try {
        site = app.findRecordById('sites', siteId);
    } catch (_) {
        return null;
    }
    if (!site) return null;
    if (inRelation(site, 'managers', userId)) return 'manager';
    if (inRelation(site, 'viewers', userId)) return 'viewer';
    // Creator is effectively a manager.
    if (inRelation(site, 'created_by', userId)) return 'manager';
    return null;
}

module.exports = { siteRole: siteRole, inRelation: inRelation };
