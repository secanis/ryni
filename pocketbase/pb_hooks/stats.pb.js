/// <reference path="../pb_data/types.d.ts" />

// RÝNI — per-site statistics route.
//
//   GET /api/ryni/sites/{siteId}/stats?from=<ISO>&to=<ISO>
//
// Auth: $apis.requireAuth() (any valid JWT); the handler then checks the
// caller is a superuser or a member (viewer/manager) of the site.

console.log('[ryni-stats] loading');

routerAdd(
    'GET',
    '/api/ryni/sites/{siteId}/stats',
    (e) => {
        require(`${__hooks}/lib/stats.js`).statsHandler(e);
    },
    $apis.requireAuth(),
);

console.log('[ryni-stats] registered GET /api/ryni/sites/{siteId}/stats');
