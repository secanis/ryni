/// <reference path="../pb_data/types.d.ts" />

// RÝNI — OIDC provider configuration route.
//
//   GET  /api/ryni/oidc  (superuser) — read saved config (secret omitted)
//   POST /api/ryni/oidc  (superuser) — save config

console.log('[ryni-oidc] loading');

routerAdd('GET', '/api/ryni/oidc', (e) => {
    require(`${__hooks}/lib/oidc.js`).handler(e);
});

routerAdd('POST', '/api/ryni/oidc', (e) => {
    require(`${__hooks}/lib/oidc.js`).handler(e);
});

console.log('[ryni-oidc] registered GET + POST /api/ryni/oidc');
