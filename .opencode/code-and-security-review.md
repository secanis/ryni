# RÝNI — Code & Security Review

- **Repo:** `secanis/ryni` (working tree `main` @ `d955534`)
- **Date:** 2026-11-02
- **Scope:** full tree (`frontend/`, `pocketbase/`, `helm/ryni/`, `.github/workflows/`, Docker, scripts)
- **Method:** applied the 22 `code-review-skills` audit checklists (JeremyMorgan/code-review-skills), consolidated below.
- **Stack:** SolidJS + Vite frontend, PocketBase v0.40 backend (JSVM hooks), nginx-unprivileged, Helm on k8s.

---

## Executive Summary

RÝNI is a self-hosted, privacy-preserving analytics app. Overall posture is **solid for an early-stage project**: no hardcoded secrets, all DB queries parameterized, no `innerHTML`/`dangerouslySetInnerHTML` sinks, non-root containers, pinned CI actions, and a well-considered Helm chart (CSPRNG secrets, `resource-policy: keep`, seccomp, NetworkPolicies).

The main weaknesses are **missing rate limiting / brute-force protection** (PocketBase ships none, and none was added), and **a few data-integrity and information-disclosure gaps** around the anonymous ingest and the user-search endpoint. Nothing here is remotely exploitable code execution; the risks are data poisoning, credential guessing, and user enumeration.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 5 |
| Low | 7 |

**Overall risk score: 5 / 10** (moderate).

### Top 5 fixes (fastest risk reduction)

1. Add rate limiting + lockout on `auth-with-password` (both `users` and `_superusers`) — currently brute-forceable.
2. Enforce the anonymous ingest boundary for non-browser clients (rate-limit `/t/{slug}`; don't treat missing `Origin` as fully trusted).
3. Stop leaking the superuser JWT in the backup-download URL query string.
4. Restrict the user-search endpoint so low-privilege users can't enumerate every account email.
5. Tighten the production CSP (`script-src` drops `'unsafe-eval'`/`'unsafe-inline'`) and cap `client_max_body_size` on `/t/`.

---

## Critical Vulnerabilities

None.

---

## High Priority

### H-1 — No rate limiting / brute-force protection anywhere (CWE-307, CWE-799)

- **Evidence:** no rate limiting exists in `pocketbase/pb_hooks/*`, `frontend/nginx.conf`, or the Helm chart. PocketBase has no built-in throttling. Login happens through the standard PB endpoints `POST /api/collections/users/auth-with-password` and `POST /api/collections/_superusers/auth-with-password` (`frontend/src/stores/auth.ts:46-60`). The only mitigation is the superuser IP allowlist (`PB_SUPERUSER_IPS`), whose default is a LAN-wide range (`docker-compose.yml:19`, `.env.example:19`).
- **Why it matters:** an attacker who can reach the API can brute-force the global admin (superuser) password or any user password with no lockout, and can spam the anonymous `/t/{slug}` ingest to pollute or DoS analytics data.
- **Remediation:** put Rýni behind a rate-limiting reverse proxy (Traefik `rateLimit` middleware, nginx `limit_req`, or Caddy) that throttles `/api/collections/*/auth-*`, `/t/`, and `/api/ryni/*`. For a self-contained fix, add a tiny per-IP counter in a hook before auth, or document a required gateway. At minimum, add `limit_req zone=login` on `location /api/` in `nginx.conf`.

---

## Medium Priority

### M-1 — Allowed-origins check bypassed by omitting the `Origin` header (CWE-346, CWE-345)

- **Evidence:** `pocketbase/pb_hooks/lib/ingest.js:138-150`. The origin enforcement only runs `if (origin)`. A request with no `Origin` header (curl, wget, any non-browser client) is treated as Variant B and trusted unconditionally.
- **Why it matters:** `allowed_origins` is documented as "the real security boundary" (`ingest.js:135-137`, `README.md:39-40`), but it is trivially bypassed. Any attacker who learns a `tracking_id`/`endpoint_slug` (both are public in the client snippet) can inject unlimited fake pageviews, referrers, and visitor ids into any site — poisoning every dashboard metric.
- **PoC (no secrets):**
  ```bash
  curl -sS -X POST https://ryni.example/t/<tracking_id> \
    -H 'Content-Type: text/plain' \
    -d '{"visitor":"attacker","type":"view","page":"/fake","referrer":"https://evil"}'
  # 200 {"ok":true} — no Origin header, accepted as Variant B.
  ```
- **Remediation:** treat the ingest as a low-trust endpoint. Options: (a) require `Origin` for Variant A and add a shared-secret/token for Variant B proxies; (b) keep Variant B trust but rate-limit + cap body size at the gateway; (c) don't allow empty `allowed_origins` to mean "any" when `Origin` is absent. Document the residual risk clearly.

### M-2 — Superuser JWT leaked in backup download URL (CWE-598)

- **Evidence:** `frontend/src/components/settings/BackupPanel.tsx:48-50` builds `.../api/backups/<key>?token=<pb.authStore.token>`. The PocketBase SDK's `authStore.token` for a superuser is a full-privilege JWT.
- **Why it matters:** the token lands in browser history, access logs, proxy logs, and any `Referer` header of a follow-up request. If those logs are ever exposed, the global admin session is compromised.
- **Remediation:** download via an authenticated fetch (the SDK's `pb.send` with `method: 'GET'` + `responseType`, or fetch with the `Authorization` header) and `Blob`/`ObjectURL`, instead of a plain `<a href>` with `?token=`. Never put auth material in the URL.

### M-3 — User email enumeration by any authenticated user (CWE-200)

- **Evidence:** `pocketbase/pb_hooks/lib/users.js:8-30` + `users.pb.js`. `GET /api/ryni/users/search?q=` is gated only by `$apis.requireAuth()`. Any authenticated user — including a `viewer` on a single site — can prefix-search every account in the system (`email ~ {:q}`).
- **Why it matters:** low-privilege users can harvest the full user directory (emails/names), which is both a privacy leak and a precursor to targeted phishing/brute-force.
- **Remediation:** restrict to superusers and site managers, or require the caller to already know a full email and return only an exact match (no prefix/`~` search). Consider returning `{found: false}` instead of an empty list to reduce enumeration signal.

### M-4 — Production CSP allows `'unsafe-eval'` and `'unsafe-inline'` (CWE-693)

- **Evidence:** `frontend/nginx.conf:20` and `helm/ryni/templates/frontend-configmap.yaml:34`: `script-src 'self' 'unsafe-inline' 'unsafe-eval'`.
- **Why it matters:** `'unsafe-eval'` largely defeats CSP's XSS protection (enables `eval`/`Function`); `'unsafe-inline'` allows inline script injection to execute. Combined with the auth token living in `localStorage` (see L-1), a single XSS = full superuser compromise.
- **Remediation:** Vite/SolidJS production builds do not require `'unsafe-eval'` or inline scripts. Drop both from `script-src`, add a nonce or keep a minimal `'unsafe-inline'` only if a dependency requires it. Move `style-src 'unsafe-inline'` to a hash if possible. Verify with a real build before shipping.

### M-5 — Large body limit on the anonymous ingest path (CWE-770)

- **Evidence:** `frontend/nginx.conf:13-14` — `client_max_body_size 500m; proxy_request_buffering off;` applies server-wide, including `location /t/` (`:65-72`). The ingest handler only ever reads 64 KB (`ingest.js:27`), yet the proxy will accept and stream a 500 MB body to PocketBase.
- **Why it matters:** an unauthenticated client can open connections and stream huge bodies to the anonymous endpoint, wasting bandwidth, memory, and backend sockets — a cheap DoS.
- **Remediation:** set a small `client_max_body_size` (e.g. `64k`) inside `location /t/`; keep the larger limit only where backups/uploads actually need it (or lower it). Prefer `proxy_request_buffering on` for `/t/`.

---

## Low Priority

### L-1 — Auth token stored in `localStorage` (CWE-922)
`pocketbase` JS SDK persists `authStore` (incl. superuser token) in `localStorage` by default; no HttpOnly cookie. XSS-resistant given SolidJS escaping + CSP, but the CSP weakness (M-4) elevates this. Acceptable for self-host; document the tradeoff or configure the SDK to not persist.

### L-2 — `created_by` / `managers` / `viewers` are client-writable on create (CWE-639-adjacent)
`sites.createRule = "@request.auth.id != ''"` (`pb_migrations/1740000000_create_ryni_collections.js:91`) with no field allowlist. A client can set `created_by` to any id and `managers`/`viewers` to any list at creation time (`frontend/src/stores/sites.ts:24-27` sets `created_by` from the client). Not privilege escalation (creator is already manager via `created_by`), but the creator marker is spoofable and membership can be assigned without consent. Consider a server hook that forces `created_by = auth.id` and ignores client-supplied membership on create.

### L-3 — Analytics field poisoning (`duration`, referrer, UA) — CWE-20
`ingest.js:168,176` accept any `duration` value (a client can send `duration: 9999999` to inflate `avgDuration`), and all `path`/`referrer`/`browser`/`os`/`device` fields are attacker-controlled strings stored verbatim. Data-integrity only (no XSS: SolidJS auto-escapes, no `innerHTML` sinks found). Clamp `duration` to a sane range (e.g. 0–86400) server-side.

### L-4 — Stats handler loads *all* records per site (CWE-770)
`stats.js:55-68` does `findRecordsByFilter('records', 'site={:s}', '-created', 0, 0)` — no limit — then applies `from`/`to` in JS *after* loading every row. O(N) per dashboard request; degrades on busy sites. Push `from`/`to` into the filter (`created >= {:from} && created <= {:to}`) and/or paginate.

### L-5 — Swallowed exceptions hide failures
`ingest.js` wraps every DB call in `catch (_) {}` (`isNewVisitor:57`, `upsertHeartbeat:71`, `applyDuration:114`, etc.). `isNewVisitor` returns `true` on DB error, so a transient failure silently records the wrong `is_new_visitor`. `stats.js:58` swallows query errors and returns empty stats (masks outages). Log these instead of discarding them.

### L-6 — HSTS sent unconditionally
`nginx.conf:19` emits `Strict-Transport-Security` even on plain-HTTP local setups (docker-compose binds `3000:8080` with no TLS). Harmless behind a TLS-terminating proxy, but can break non-HTTPS self-hosters. Consider enabling HSTS only when `X-Forwarded-Proto: https`.

### L-7 — OIDC client secret handling (note, not a defect)
`oidc.js:22-63` stores the OIDC `clientSecret` in the `users` collection `oauth2.providers` settings (encrypted at rest by PocketBase when `PB_SECRET` is set). No GET endpoint re-exposes it (good), but the superuser submits it through a plaintext form field (`OidcForm.tsx:57-65`). Ensure HTTPS end-to-end; consider `autocomplete="off"`.

---

## Security Recommendations

1. **Implementation priorities:** H-1 → M-1 → M-2 → M-3 → M-4/M-5 (see top-5 list).
2. **Adopt:** dependency scanning (Dependabot/`npm audit` — none configured today), secret scanning (GitHub push protection), and a rate-limiting middleware in front of PocketBase.
3. **Process:** add a negative-path test suite for the ingest (missing Origin, oversized body, bogus `duration`), for auth (brute-force), and for the collection rules (records/heartbeats not listable by non-superusers).
4. **Training:** document the "Variant A vs B" trust model and the residual anonymous-ingest risk to operators so it's a conscious decision, not an assumption.

---

## Compliance / Checklist Coverage

- **OWASP Top 10 (2021) mapping:** A01 Broken Access Control — mostly OK (server-side `siteRole` checks, deny-by-default null rules), see M-1/L-2. A02 Cryptographic Failures — OK (PB_SECRET enforced 32 chars, TLS-terminated). A03 Injection — OK (all filters use `{:param}`; no raw string SQL except migration index DDL over internal constants). A04 Insecure Design — see M-1 trust model. A05 Misconfiguration — see M-4/M-5/HSTS. A07 Auth Failures — see H-1, L-1. A09 Logging — see L-5. Others N/A.
- **GDPR (EU data):** favorable by design — no IP storage, no cookies, DNT honored, anonymous visitor ids. Note: `referrer`/`path` can carry personal data; ensure a retention/deletion policy exists for `records`.
- **PCI DSS:** N/A (no payment data).
- **SOC 2:** backup access control (M-2) and audit logging of privileged ops (currently absent) would need addressing before any SOC 2 posture.

---

## Checklist Diff (skill-by-skill)

| Skill | Pass | Notes |
|-------|------|-------|
| secrets-management-audit | ✅ | No hardcoded secrets; env/Secret-driven; SHA-pinned, CSPRNG in Helm |
| database-security | ✅ (mostly) | Parameterized filters; no `queryRaw` with user input; `records`/`heartbeats` superuser-only via API |
| input-validation | ✅ | No SQL/NoSQL/command injection; body size capped in handler (64 KB) |
| authentication-flow-review | ⚠️ | No rate limiting (H-1); token in localStorage (L-1); PB handles hashing correctly |
| authorization-implementation | ⚠️ | Server-side role checks good; `created_by`/membership client-writable on create (L-2); origin bypass (M-1) |
| session-cookie-security | ⚠️ | PB JWT (HttpOnly cookie not used); no CSRF token but SameSite/bearer-token model; no rate limit |
| business-logic-vulnerabilities | ⚠️ | No money/inventory logic; analytics-poisoning + race on heartbeat upsert possible |
| file-handling-business-logic | N/A | No user file uploads (only PB backup downloads) |
| logging-monitoring | ❌ | No security logging of failures; swallowed errors (L-5); no alerting |
| api-and-infrastructure | ✅ (mostly) | Non-root, read-only FS, NetworkPolicies, pinned actions; see M-5, L-6 |
| code-quality-metrics | ⚠️ | `stats.js` 210-line aggregate function; `handler()` multi-step; see CQ below |
| error-handling-resilience | ❌ | Blanket `catch {}` everywhere; silent failures |
| readability-and-naming | ✅ | Consistent, well-commented; some magic strings (`'view'/'end'/'heartbeat'`) |
| solid-principles | ⚠️ | Hooks are functional/cohesive; `stats.js` SRP violation |
| testing-implementation | ✅ (good) | Unit + integration tests present; gap: no security/negative tests |
| code-duplication | ⚠️ | `readJsonBody`/`reply` duplicated across hook libs |
| design-patterns / initial-design | ✅ | Clear layering (tracker / hooks / frontend stores / Helm) |

---

## Code-Quality Findings (consolidated)

- **CQ-1 (SRP, complexity):** `pocketbase/pb_hooks/lib/stats.js:31-208` is a 178-line function that queries, filters, aggregates, computes sessions/bounce, and builds live-visitor counts. Split into pure helpers (`filterRange`, `aggregate`, `computeSessions`, `liveVisitors`) and unit-test each.
- **CQ-2 (perf):** a single page view triggers 3–4 DB round-trips — `isNewVisitor` (`ingest.js:50-60`), optional `applyDuration` (`:93-115`), `save` (`:192`), and `upsertHeartbeat` (`:194` → `:62-80`). At scale this is an N+1 pattern; batch or cache the `is_new_visitor` determination.
- **CQ-3 (duplication):** `readJsonBody` exists in both `ingest.js:25-31` and `oidc.js:14-20`; `reply` exists in both `ingest.js:18-23` and `http.js:10-15`. Extract into `lib/http.js` and import everywhere.
- **CQ-4 (error handling):** pervasive `catch (_) {}` swallows real failures (L-5). Introduce a lightweight `logError` helper and call it in each catch.
- **CQ-5 (magic values):** ingest `type` strings (`'view'`, `'end'`, `'heartbeat'`) and role strings (`'manager'`, `'viewer'`) are repeated literals; centralize as constants.
- **CQ-6 (tests):** good coverage of tracker/stores/PB integration (`*.test.ts`), but missing: origin-bypass test, oversized-body test, unauthorized `records` API access test, brute-force/lockout test, and a stored-XSS regression test asserting no `innerHTML` usage.

---

## Strengths (worth keeping)

- **CI/CD hardening:** Actions pinned to commit SHAs; `permissions: contents: read` by default with `write` scoped to the two jobs that need it; `workflow_dispatch` tag validated by strict semver regex; inputs passed via `env:` (no `${{ }}` in `run:` scripts) — `release.yml` is exemplary.
- **Container security:** PocketBase binary SHA-256 verified at build; non-root `pocketbase` (uid 1000) and `nginx-unprivileged`; `docker-compose` binds PB to `127.0.0.1` only.
- **Helm data-safety:** `helm.sh/resource-policy: keep` on PVC, PB_SECRET, and superuser secret; secrets regenerated via `lookup` (never silently rotated); `randAlphaNum` CSPRNG.
- **K8s hardening:** `readOnlyRootFilesystem`, `drop: [ALL]` capabilities, `seccompProfile: RuntimeDefault`, `automountServiceAccountToken: false`, NetworkPolicies for PocketBase.
- **Privacy by design:** no cookies, no raw IP storage, DNT honored (`identity.ts:20-23`), coarse UA detection (`detect.ts`), `sendBeacon` with no CORS preflight.
- **No XSS sinks:** zero `innerHTML`/`dangerouslySetInnerHTML`/`eval` in the frontend; SolidJS text escaping covers stored analytics strings.
- **Migration safety:** idempotent field/index creation with `IF NOT EXISTS`; rollback handlers avoid data loss.

---

## Remediation Status (2026-11-02)

| Finding | Status | How |
|---------|--------|-----|
| H-1 (no rate limiting) | ✅ Fixed | PB built-in rate limiter enabled via `pb_migrations/1740000003_enable_rate_limits.js` (auth 10/min, password reset 3/min, ingest `POST /t/` 300/min, create 60/min, API 2000/min; loopback excluded). Plus nginx `limit_req` on `/t/` as defense-in-depth (`nginx.conf` + Helm `frontend.rateLimit`). |
| M-2 (superuser JWT in backup URL) | ✅ Fixed | `BackupPanel.tsx` downloads via `fetch` with `Authorization` header + `Blob`/`ObjectURL`; no token in the URL. |
| M-3 (user email enumeration) | ✅ Fixed | `pb_hooks/lib/users.js` now requires superuser or a site manager, and uses exact match (`email = {:q} || name = {:q}`) instead of `~`. |
| M-4 (CSP `'unsafe-eval'`/`'unsafe-inline'`) | ✅ Fixed | `script-src 'self'` only in `nginx.conf` + Helm configmap. Verified prod build emits no inline scripts. |
| M-5 (`client_max_body_size 500m` on `/t/`) | ✅ Fixed | `client_max_body_size 64k` + `proxy_request_buffering on` in `location /t/` (both configs). |
| M-1 (allowed-origins bypass via missing `Origin`) | ✅ Fixed | No-`Origin` (Variant B) requests now require `Sec-Fetch-Site: same-origin`/`same-site`, blocking curl/wget poisoning (layered with the ingest rate limit). Best-effort browser signal — a determined client can spoof the header. |
| L-3 (duration field poisoning) | ⚠️ Open | Still unclamped; `duration` accepted as-is from the client. |
| L-4 (stats loads all rows) | ⚠️ Open | `stats.js` still filters in JS after loading all records. |
| L-5 (swallowed exceptions) | ⚠️ Open | Blanket `catch (_) {}` still discards failures. |
| L-1/L-2/L-6/L-7 | ⚠️ Open | Documented, low priority; not changed. |

**Verification performed:** `helm lint` ✅ · `helm template` render ✅ · `nginx -t` (both configs) ✅ · `frontend` lint/typecheck/build/unit tests ✅ · `pocketbase` vitest integration suite (29 tests, incl. migration apply + new `users` gate) ✅ · rate-limiter settings confirmed via `GET /api/settings`.
