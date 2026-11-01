/// <reference path="../../pb_data/types.d.ts" />

// RÝNI — OIDC provider registration.
//
// POST /api/ryni/oidc (superuser)
//   body: { displayName, clientId, clientSecret, authUrl, tokenUrl, userInfoUrl }
//
// Registers an OIDC provider named "oidc" on the `users` collection (so
// `authWithOAuth2({ provider: "oidc" })` works) and enables OAuth2. No
// group→role promotion in v1.

var http = require(`${__hooks}/lib/http.js`);

function readJson(e) {
    try {
        return JSON.parse(readerToString(e.request.body, 64 * 1024) || '{}') || {};
    } catch (_) {
        return {};
    }
}

function registerProvider(app, cfg) {
    var users = app.findCollectionByNameOrId('users');
    var oauth2 = users.oauth2 || {};

    // Reconstruct existing providers as plain objects (goja values), keeping
    // everything except the "oidc" entry we are about to replace.
    var providers = [];
    try {
        providers = (oauth2.providers || [])
            .map(function (p) {
                return {
                    name: String(p.name || ''),
                    displayName: String(p.displayName || ''),
                    clientId: String(p.clientId || ''),
                    clientSecret: String(p.clientSecret || ''),
                    authURL: String(p.authURL || ''),
                    tokenURL: String(p.tokenURL || ''),
                    userInfoURL: String(p.userInfoURL || ''),
                };
            })
            .filter(function (p) {
                return p.name && p.name !== 'oidc';
            });
    } catch (_) {
        providers = [];
    }

    providers.push({
        name: 'oidc',
        displayName: String(cfg.displayName || 'OIDC'),
        clientId: String(cfg.clientId || ''),
        clientSecret: String(cfg.clientSecret || ''),
        authURL: String(cfg.authUrl || ''),
        tokenURL: String(cfg.tokenUrl || ''),
        userInfoURL: String(cfg.userInfoUrl || ''),
    });

    oauth2.providers = providers;
    oauth2.enabled = true;
    users.oauth2 = oauth2;
    app.save(users);
}

function handler(e) {
    if (!e.hasSuperuserAuth()) {
        return http.replyError(e, 403, 'superuser required');
    }

    var body = readJson(e);
    if (!body.clientId || !body.clientSecret || !body.authUrl || !body.tokenUrl || !body.userInfoUrl) {
        return http.replyError(e, 400, 'clientId, clientSecret, authUrl, tokenUrl and userInfoUrl are required');
    }

    try {
        registerProvider($app, body);
    } catch (err) {
        return http.replyError(e, 500, 'failed to save OIDC provider: ' + (err && err.message ? err.message : err));
    }

    http.reply(e, 200, { ok: true });
}

module.exports = { handler: handler, registerProvider: registerProvider };
