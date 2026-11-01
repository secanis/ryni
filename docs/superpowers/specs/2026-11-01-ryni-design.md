# Rýni — Design

Date: 2026-11-01
Status: draft (awaiting approval)

## Intent & why

Rýni ("analysis" / "scrutiny", Icelandic — sibling to STJÓRNA) is a
self-hosted, privacy-preserving web analytics tool in the spirit of Ackee.
We like _how_ Ackee tracks (no cookies, respects Do Not Track,
privacy-first) but not Ackee itself — chiefly its client-only design, which
gets blocked by adblockers and can't be driven server-side and is based on
MongoDB, which provides some provisioning overhead, at least for small
setups.

Rýni's three concrete differentiators over Ackee:

1. **Two integration variants, both driven by the same client script:**
   - **Variant A (direct):** the tracking script posts straight to the Rýni
     server (cross-origin, CORS-gated).
   - **Variant B (proxy):** the tracking script posts to a route on the
     site's _own_ origin (same domain), which the app server forwards to
     Rýni. Because the request is same-origin, adblockers that block
     cross-origin analytics can't see it.
2. **Adblock resistance by design:** innocuous, per-site-configurable script
   filename and endpoint slug (never `tracker.js`, never `/api/track`).
3. **Deployment:** Changed architecture allows a simpler an easier container
   installation

The stack is deliberately identical to STJÓRNA so we can run both with
the same muscle memory, tooling, and deployment story.

## Goals

- Self-hosted analytics with the full core similar to Ackee's dashboard: total
  views, unique visitors, average duration, bounce rate, time-series graph,
  referrers, browsers, operating systems, devices, screen sizes, per-page
  views, and a live/current-visitor count — over a selectable date range.
- No cookies. Visitor identity lives in `localStorage` (a random id) set by
  the client script, which both variants run, so identity works uniformly.
- Respect Do Not Track (`navigator.doNotTrack === "1"` → send nothing).
- Multiple websites (sites), each with a short tracking id.
- Two copy-paste snippets shown on the "add site" screen — Variant A and
  Variant B — plus the proxy setup note for B.
- Simple auth (simpler than STJÓRNA's superuser/tenant/membership tiers):
  - a **global admin** (SSO/OIDC config, backups, all sites, user
    management),
  - per-site **viewer** (read stats only) and **manager** (read + edit site
    config + share/delete the site),
  - any logged-in user can create a site and becomes its manager.
- SSO via OIDC (like STJÓRNA), with local email/password as a fallback and
  for the first admin.
- Backup of the instance.

## Non-goals

- Real-time push (WebSocket). v1 uses polling (or SSE as a stretch goal).
- Custom events / "actions" (Ackee's event tracking) — deferred to a later
  release.
- Funnel / conversion analysis, campaign attribution beyond referrer.
- A hosted SaaS — this is self-host only.

## Anti-goals (what would make this a failure even if it works)

- Shipping analytics that still get blocked by mainstream adblockers in
  Variant B (that's the entire point of the same-origin trick).
- Reintroducing STJÓRNA's tenant/membership complexity — Rýni's model must
  stay obviously simpler.
- Collecting PII or fingerprinting: no raw IP storage, no cookie, no
  cross-site tracking. If the privacy bar slips, the project has failed its
  premise.

## Constraints

- **Stack is fixed** (mirror STJÓRNA):
  - Frontend: SolidJS + Vite + TypeScript + Tailwind + `@solidjs/router` +
    `@ark-ui/solid` + `lucide-solid` + `pocketbase` client.
  - Backend: PocketBase with JS hooks (`pb_hooks/*.pb.js` + `lib/*.js`) and
    timestamped migrations (`pb_migrations/*.js`).
  - Packaging: Docker Compose (two images: `ryni-pocketbase`,
    `ryni-frontend`), plus a Helm chart and GitHub Actions CI/CD as the
    end-state (see Phasing).
- **Ingest path is anonymous and hot.** The tracking endpoint is a public
  write-only PocketBase route — no auth token, high volume, must answer in
  single-digit ms. Aggregations (per day, per referrer, …) run server-side
  in custom routes (like STJÓRNA's `stats.pb.js`), never by pulling all rows
  to the frontend.
- **Privacy:** store only a hashed/random visitor id, no raw IP, no cookie.
  DNT honored. `ignoreOwnVisits` (skip the site owner's own visits) is
  **deferred** — cross-origin cookie-free owner detection is nontrivial and
  not in v1.

## Approaches

The high-level approach was never in question: **mirror STJÓRNA's stack and
repo layout.** Two sub-choices were put to the codeowner:

1. **Phasing** (picked: "start with 1, end at 2"):
   - **Phase 1 — lean core:** `frontend/` + `pocketbase/` +
     `docker-compose.yml` + unit/integration tests + a thin `ci.yml`
     (typecheck/build/test). Goal: a working tracker+dashboard fast.
   - **Phase 2 — full STJÓRNA mirror:** Helm chart, docs site, Playwright
     e2e, `release.yml` with Docker Hub/ghcr images and chart publishing.
2. **Backup semantics** (not explicitly answered by the codeowner — resolved as a
   builder call, see below).

## The parts of the how, as decided

### Data model (PocketBase collections)

- `users` — PocketBase auth collection. Rýni dashboard users.
- `sites` — one row per tracked website. Fields: `id`, `name`,
  `tracking_id` (short, random, canonical site identifier),
  `allowed_origins` (CORS allowlist for Variant A), `endpoint_slug`
  (innocuous path segment, globally unique, defaults to `tracking_id`),
  `created_by` (user id).
- `user_sites` — junction: `user`, `site`, `role` (`viewer` | `manager`).
  Enforced by collection API rules, not only the UI.
- `records` — one row per page view. Fields: `site`, `visitor_id` (random id
  from `localStorage`, never raw IP), `url`/`path`, `referrer`, `browser`,
  `os`, `device`, `screen_size`, `duration` (seconds, filled when the next
  view/session end arrives), `is_new_visitor` (bool), `created` timestamp.
  Server-side aggregation derives all dashboard metrics from this one
  collection.

### Auth & permissions

- PocketBase `_superusers` = the **global admin** (instance operator):
  OIDC config, backups, all sites, user management. Created from env on
  first boot (like STJÓRNA). OIDC does **not** grant global admin — it only
  authenticates regular `users`. This keeps the "global admin" on PB's
  built-in mechanism instead of inventing one — the complexity being dropped
  is STJÓRNA's tenant/role machinery, not the operator account.
- `users` = regular dashboard users. Login via local email/password (PB
  native) and/or OIDC (registered as a PB OAuth2 provider on `users`, mirror
  STJÓRNA's `oidc_config.pb.js`). OIDC authenticates the user; no
  group→role promotion in v1.
- Per-site permissions via `user_sites.role`: `viewer` (read stats) or
  `manager` (read + edit config + share + delete). "Share" means granting
  another Rýni user access (viewer/manager) — no anonymous/public link. A
  user who creates a site gets a `manager` row. No "editor" tier.

### Tracking ingest (the two variants)

- Client script `ryni.js` (name configurable). Loaded via a `<script>` tag
  with data attributes: `data-ryni-server`, `data-ryni-site`,
  `data-ryni-detailed`. On load it:
  1. checks DNT → aborts silently if set,
  2. reads/creates the `localStorage` visitor id,
  3. captures page, referrer, UA-derived browser/os/device, screen size,
  4. `POST`s a small JSON body to the configured endpoint,
  5. on `pagehide`/`visibilitychange:hidden`, sends the session end to fill
     in `duration`.
- **Variant A** endpoint: `POST {ryni_server}/{endpoint_slug}` with CORS
  restricted to the site's `allowed_origins`.
- **Variant B** endpoint: `POST {site_origin}/{endpoint_slug}` — the app
  server forwards it to Rýni. Rýni ships a snippet + a short proxy config
  note (nginx `location` / framework route examples).
- The Rýni ingest route is a PocketBase custom route (`routerAdd`), anonymous,
  writes one `records` row. It resolves the site by `endpoint_slug` (path) or
  `tracking_id` (body), enforces `allowed_origins` for Variant A, and drops
  requests whose site is unknown (404) so adblock testers can't fingerprint.
  Variant B has no browser `Origin`, so v1 assumes a trusted self-host (no
  auth on ingest, like Ackee); rate-limiting and an optional per-site secret
  are deferred.

### Metrics & session semantics

Follow Ackee:

- `visitor_id` = random id in `localStorage`, namespaced per `tracking_id`
  (no cookie, no raw IP). DNT honored: `navigator.doNotTrack === "1"` →
  no request.
- **Unique visitor** = distinct `visitor_id` within the selected date range.
- **New visitor** = `visitor_id` first-ever seen, relative to the range
  (`is_new_visitor`).
- **Duration** = per-view; filled when the next view arrives, or on
  `pagehide` / `visibilitychange:hidden` (more reliable than `unload`). The
  final view of a session has null duration and is excluded from the
  average.
- **Session** = consecutive views with ≤ 30 min idle gap. **Bounce** =
  a session with exactly one view; **bounce rate** = bounces ÷ sessions.
- **Live / current visitors** = `visitor_id`s with a view (or heartbeat)
  within the last N minutes (N configurable, default 5). Implemented with a
  lightweight heartbeat from the client script + polling in the dashboard.
- **SPA** — v1 counts full page loads; `data-ryni-detailed` re-fires on
  `pushState`/`popstate` (Ackee's `detailed` option).

### Dashboard

- Site list (cards with quick stats) + a per-site dashboard.
- Metrics: total views, unique visitors, avg duration, bounce rate, current
  visitors; time-series chart; referrers, browsers, OS, devices, screen
  sizes, pages breakdowns — all over a selectable date range.
- Snippets screen when adding a site: shows Variant A and Variant B snippets
  side by side with the proxy note.

### Backup

Resolved as: use PocketBase's built-in `/api/backups` endpoint (full-instance
zip of `pb_data`). Surface it in the admin UI as a **Create backup** +
**Download** action, plus a scheduled-backup hook (interval via env var).
This is full-instance backup, not per-site — Rýni is single-tenant per
instance, so per-site export adds nothing for v1.

## Phasing

- **Phase 1 (build now):** lean core above. Deliverable: a working tracker
  (both variants) + dashboard + auth + backup, running under
  `docker compose up`, with unit/integration tests and a thin CI.
- **Phase 2 (fast-follow):** Helm chart, docs site, Playwright e2e, full
  release pipeline — reaching exact STJÓRNA parity in repo shape and
  deployment.

## What's left to the builder

- Exact collection schema details and API rule expressions.
- OIDC group→role mapping specifics.
- The scheduled-backup hook interval and implementation.
- Specific chart library for the time-series graph (use what STJÓRNA already
  bundles or a small dependency consistent with the stack).
- Ingest route's exact JSON shape and validation details.
