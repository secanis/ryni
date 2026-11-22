/// <reference path="../../pb_data/types.d.ts" />

// RÝNI — OIDC provider registration.
//
//   GET  /api/ryni/oidc  (superuser) — current provider config, secret omitted
//   POST /api/ryni/oidc  (superuser)
//        body: { displayName, clientId, clientSecret?, authUrl, tokenUrl, userInfoUrl }
//
// Registers an OIDC provider named "oidc" on the `users` collection (so
// `authWithOAuth2({ provider: "oidc" })` works) and enables OAuth2. No
// group→role promotion in v1.
//
// `clientSecret` is only required on first setup: when it is omitted (or
// empty) on an update, the stored secret is kept so the admin does not have
// to re-enter it every time another field changes.

var http = require(`${__hooks}/lib/http.js`);

function readJson(e) {
    try {
        return JSON.parse(readerToString(e.request.body, 64 * 1024) || '{}') || {};
    } catch (_) {
        return {};
    }
}

function findProvider(app) {
    try {
        var users = app.findCollectionByNameOrId('users');
        var oauth2 = users.oauth2 || {};
        var providers = oauth2.providers || [];
        for (var i = 0; i < providers.length; i++) {
            if (String(providers[i].name || '') === 'oidc') return providers[i];
        }
    } catch (_) {}
    return null;
}

function registerProvider(app, cfg) {
    var users = app.findCollectionByNameOrId('users');
    var oauth2 = users.oauth2 || {};
    var existing = findProvider(app) || {};

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
                    pkce: p.pkce,
                    extra: p.extra,
                };
            })
            .filter(function (p) {
                return p.name && p.name !== 'oidc';
            });
    } catch (_) {
        providers = [];
    }

    // An empty clientSecret on update means "keep the current one".
    var clientSecret = String(cfg.clientSecret || '');
    if (!clientSecret) clientSecret = String(existing.clientSecret || '');

    providers.push({
        name: 'oidc',
        displayName: String(cfg.displayName || 'OIDC'),
        clientId: String(cfg.clientId || ''),
        clientSecret: clientSecret,
        authURL: String(cfg.authUrl || ''),
        tokenURL: String(cfg.tokenUrl || ''),
        userInfoURL: String(cfg.userInfoUrl || ''),
        pkce: existing.pkce != null ? existing.pkce : null,
        extra: existing.extra != null ? existing.extra : {},
    });

    oauth2.providers = providers;
    oauth2.enabled = true;
    users.oauth2 = oauth2;
    app.save(users);
}

function readConfig(app) {
    var provider = findProvider(app);
    if (!provider) {
        return {
            configured: false,
            enabled: false,
            displayName: 'OIDC',
            clientId: '',
            authUrl: '',
            tokenUrl: '',
            userInfoUrl: '',
            hasSecret: false,
        };
    }

    var users = app.findCollectionByNameOrId('users');
    var oauth2 = users.oauth2 || {};

    return {
        configured: true,
        enabled: oauth2.enabled === true,
        displayName: String(provider.displayName || 'OIDC'),
        clientId: String(provider.clientId || ''),
        authUrl: String(provider.authURL || ''),
        tokenUrl: String(provider.tokenURL || ''),
        userInfoUrl: String(provider.userInfoURL || ''),
        // Never return the secret itself — only whether one is stored.
        hasSecret: !!String(provider.clientSecret || ''),
    };
}

function handler(e) {
    if (!e.hasSuperuserAuth()) {
        return http.replyError(e, 403, 'superuser required');
    }

    if (e.request.method === 'GET') {
        return http.reply(e, 200, { ok: true, config: readConfig($app) });
    }

    var body = readJson(e);
    if (!body.clientId || !body.authUrl || !body.tokenUrl || !body.userInfoUrl) {
        return http.replyError(e, 400, 'clientId, authUrl, tokenUrl and userInfoUrl are required');
    }

    // First-time setup always needs a secret; updates may keep the stored one.
    if (!body.clientSecret && !findProvider($app)) {
        return http.replyError(e, 400, 'clientSecret is required for the initial OIDC setup');
    }

    try {
        registerProvider($app, body);
    } catch (err) {
        return http.replyError(e, 500, 'failed to save OIDC provider: ' + (err && err.message ? err.message : err));
    }

    http.reply(e, 200, { ok: true, config: readConfig($app) });
}

module.exports = { handler: handler, registerProvider: registerProvider, readConfig: readConfig };
