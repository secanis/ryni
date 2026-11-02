/// <reference path="../pb_data/types.d.ts" />

// RÝNI — enable PocketBase's built-in rate limiter with secure defaults.
//
// PocketBase v0.23+ ships an IP-based token-bucket rate limiter
// (Dashboard > Settings > Application > Rate limits) that is DISABLED by
// default. This migration turns it on and seeds sensible rules on a fresh
// install, so the login/reset/ingest/create endpoints are protected from
// brute force and abuse out of the box.
//
// It runs once (like all migrations): operators can tune the rules later from
// the Dashboard, and this migration won't clobber an operator who already
// configured `rateLimits` before it shipped.
//
// Rules (PB resolves them in precedence order, stopping on the first match):
//   *:auth                  all auth methods (login, OTP, password reset, …)
//   *:requestPasswordReset  password-reset email (throttle sender abuse)
//   POST /t/                anonymous tracking ingest (custom route)
//   *:create                record/site/backup creation
//   /api/                   broad API ceiling
//
// `excludedIPs` whitelists loopback so the integration-test container
// (`--network=host`) and local dev don't trip the limiter. Real clients reach
// PocketBase exclusively through the frontend nginx, which sets
// X-Forwarded-For / X-Real-IP; `trustedProxy` tells PB to read the client IP
// from those headers instead of the proxy's own address. (PB is only reachable
// via that proxy — loopback bind in docker-compose, NetworkPolicy in Helm — so
// trusting those headers is safe.)

migrate(
    (app) => {
        const settings = app.settings();
        const rl = settings.rateLimits;
        const hasRules = !!(rl && rl.rules && rl.rules.length > 0);

        // Respect an operator who already configured rate limits.
        if (rl && rl.enabled && hasRules) {
            return;
        }

        settings.rateLimits.enabled = true;
        settings.rateLimits.excludedIPs = ['127.0.0.1', '::1'];
        settings.rateLimits.rules = [
            { label: '*:auth', audience: '', duration: 60, maxRequests: 10 },
            { label: '*:requestPasswordReset', audience: '', duration: 60, maxRequests: 3 },
            { label: 'POST /t/', audience: '', duration: 60, maxRequests: 300 },
            { label: '*:create', audience: '', duration: 60, maxRequests: 60 },
            { label: '/api/', audience: '', duration: 60, maxRequests: 2000 },
        ];

        settings.trustedProxy.headers = ['X-Forwarded-For', 'X-Real-IP'];
        settings.trustedProxy.useLeftmostIP = true;

        app.save(settings);
    },
    (app) => {
        // Rollback: leave the limiter as-is. Disabling it would be a silent
        // security regression; PB rolls back the transaction automatically.
    },
);
