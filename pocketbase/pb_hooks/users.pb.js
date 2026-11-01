/// <reference path="../pb_data/types.d.ts" />

// RÝNI — user search route (share dialog).
//
//   GET /api/ryni/users/search?q=<email|name>
//
// Any authenticated user can resolve an email/name to a user id.

console.log('[ryni-users] loading');

routerAdd(
    'GET',
    '/api/ryni/users/search',
    (e) => {
        require(`${__hooks}/lib/users.js`).handler(e);
    },
    $apis.requireAuth(),
);

console.log('[ryni-users] registered GET /api/ryni/users/search');
