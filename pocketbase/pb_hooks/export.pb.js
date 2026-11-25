/// <reference path="../pb_data/types.d.ts" />

// RÝNI — per-site raw pageview export route.
//
//   GET /api/ryni/sites/{siteId}/export?from=<ISO>&to=<ISO>
//
// Auth: $apis.requireAuth() (any valid JWT); the handler then checks the
// caller is a superuser or a member (viewer/manager) of the site.

console.log('[ryni-export] loading');

routerAdd(
    'GET',
    '/api/ryni/sites/{siteId}/export',
    (e) => {
        require(`${__hooks}/lib/export.js`).exportHandler(e);
    },
    $apis.requireAuth(),
);

console.log('[ryni-export] registered GET /api/ryni/sites/{siteId}/export');
