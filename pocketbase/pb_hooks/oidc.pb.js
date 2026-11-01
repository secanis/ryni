/// <reference path="../pb_data/types.d.ts" />

// RÝNI — OIDC provider configuration route.
//
//   POST /api/ryni/oidc  (superuser)

console.log('[ryni-oidc] loading');

routerAdd('POST', '/api/ryni/oidc', (e) => {
    require(`${__hooks}/lib/oidc.js`).handler(e);
});

console.log('[ryni-oidc] registered POST /api/ryni/oidc');
