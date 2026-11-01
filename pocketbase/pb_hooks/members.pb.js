/// <reference path="../pb_data/types.d.ts" />

// RÝNI — per-site members route (dashboard member badges).
//
//   GET /api/ryni/sites/{siteId}/members
//
// Auth: $apis.requireAuth() (any valid JWT); the handler then checks the
// caller is a superuser or a member (viewer/manager) of the site.

console.log('[ryni-members] loading');

routerAdd(
    'GET',
    '/api/ryni/sites/{siteId}/members',
    (e) => {
        require(`${__hooks}/lib/members.js`).membersHandler(e);
    },
    $apis.requireAuth(),
);

console.log('[ryni-members] registered GET /api/ryni/sites/{siteId}/members');
