# Rýni privacy tiers & disclosure — design

Date: 2026-11-21
Status: draft, awaiting approval

## Intent & why

Rýni's pitch is "privacy-preserving analytics, no cookies, no fingerprinting,
honors DNT." Today that posture is binary and, in one respect, brittle: the
visitor id lives in `localStorage`, and when that write fails (private mode)
every page load becomes a new "unique visitor," inflating the number. Site
owners also have no ready way to tell their visitors what Rýni collects — GDPR
Art 13 transparency applies even without a cookie banner, and the burden sits
on the site owner (controller), not Rýni (processor).

This change turns the single privacy posture into an explicit, per-site choice,
gives owners the disclosure material to match, and fixes the private-mode
inflation. It is what makes Rýni a "real v1": the privacy promise becomes
configurable and documented instead of assumed.

## Goals

1. Per-site **tracking tier** — the owner picks how much Rýni stores on a
   visitor's device. Default is the current behavior (Standard).
2. Per-site **disclosure** — the owner picks whether to publish a text notice
   (for their privacy policy) and/or a dismissible on-page banner, with copy
   generated to match the chosen tier.
3. Fix private-mode unique-visitor inflation in Standard tier (sessionStorage
   fallback).
4. Document the tiers, the ePrivacy/GDPR analysis, and the remaining
   limitations of a no-cookie model.

## Non-goals

- No fingerprinting. This is already an anti-goal in
  `docs/superpowers/specs/2026-11-01-ryni-design.md` ("If the privacy bar slips,
  the project has failed its goal") and is stated on the landing page. We
  explicitly rejected fingerprintjs (BSL/MIT licensing, paid-Pro accurate path,
  contradicts DNT and the whole product). Not revisited.
- No cookies. All tiers use `localStorage`/`sessionStorage`/nothing — never a
  cookie. The "no cookies" headline stays true.
- No consent management. The banner is informational (a transparency notice),
  not a consent wall. We do not build consent collection, because no tier
  requires it under Rýni's model (DNT is the opt-out).
- No server-side IP retention or cross-site identity. Unchanged.

## Anti-goals

- A tier that silently over-collects: every tier must be strictly less-or-equal
  to Standard in what it stores.
- A disclosure that lies about what a tier does. Copy is generated from the
  tier, never hand-waved.
- Breaking existing sites: sites without the new fields behave exactly as today.

## Constraints

- Tracker is a static IIFE bundle (`frontend/public/ryni.js`) loaded with
  `data-ryni-*` attributes. The tier must reach the tracker through a
  `data-ryni-*` attribute baked into the snippet — the script makes no config
  fetch. Backward-compatible: absent attribute = Standard.
- Backend is PocketBase JSVM hooks (`pb_hooks/lib/ingest.js`, `stats.js`).
  `records.visitor_id` is `required`. `stats.js` computes every metric by
  folding `records`; `heartbeats` powers the live count.
- Ingest must stay anonymous and cheap: no auth, `sendBeacon`, no config fetch
  per event. The tier is read from the already-loaded `site` record.

## Approaches considered

### Tracking identity

- **Standard / Session / Minimal tiers** (chosen). Three storage levels on one
  continuum; each removes a class of metric rather than degrading silently.
- Cookie fallback (rejected): most accurate uniques, but breaks "no cookies"
  and analytics cookies are consent-territory under ePrivacy.
- FingerprintJS (rejected): see Non-goals.

### Disclosure

- **Generated text + self-contained banner snippet, owner picks** (chosen).
  Text pastes into the owner's policy; banner is a small self-contained
  HTML+JS snippet (no dependency on the tracker, works for Variant A and B).
- Banner injected by the tracker script (rejected): intrusive — an analytics
  script shouldn't inject UI; conflicts with existing consent tooling.
- Docs-only guidance (rejected alone): owners still had to hand-write copy.

## Decisions made

- Three tiers; default **Standard**. Owner can downgrade per site.
- "No localStorage" means **both** session-only (sessionStorage) and
  truly-nothing (no storage) tiers exist; owner picks.
- Disclosure: **both** text and banner, owner decides which to use.
- **Minimal = no-id-only.** Drops the stored id (and therefore correlation)
  but keeps every per-event field as aggregate breakdowns. Considered and
  rejected: also stripping referrer/title/UTM (the only fields that can carry
  content-level PII). Rejected to keep the tier axis about *device storage*,
  not *collection breadth* — mixing the two would turn 3 tiers into a matrix.
- Work ships in two phases (Tiers first, then Disclosure + docs). The earlier
  "A+B" items are absorbed: sessionStorage fallback = part of the tier
  mechanism; documenting the uniques limitation = part of the docs phase.

## Design detail

### Data model (Phase 1)

New `sites` fields via migration `1740000005_add_privacy_settings.js`:

- `tracking_mode` — SelectField `standard` (default) | `session` | `minimal`.
- `disclosure_mode` — SelectField `none` (default) | `text` | `banner`.
  (Added in Phase 2, but one migration can carry both if convenient.)

`disclosure_mode=none` is the default so existing sites change nothing until
the owner opts in.

Migration backfills existing `sites` rows to `standard`/`none`, and every read
site (ingest, dashboard hide-logic, disclosure generator) additionally treats
an empty/missing value as `standard`. The anti-goal "existing sites behave as
today" is enforced at the read boundary, not just by the field default — PB
applies `SelectField` defaults at create time only, so backfill alone is not a
guarantee against a row with an empty value.

### Tier semantics & what the tracker sends

|                         | Standard                                                  | Session                            | Minimal                           |
| ----------------------- | --------------------------------------------------------- | ---------------------------------- | --------------------------------- |
| id store                | localStorage, fallback sessionStorage, fallback ephemeral | sessionStorage, fallback ephemeral | none — fresh random per page load |
| `view` beacon           | yes                                                       | yes                                | yes                               |
| `heartbeat` beacon      | yes                                                       | yes                                | no                                |
| `end` (duration) beacon | yes                                                       | yes                                | no                                |

- **Standard** (current): persistent id. Adds the sessionStorage fallback so a
  blocked-storage visitor correlates within the tab instead of per page.
- **Session**: sessionStorage id. Per-session uniques/duration/bounce/live work;
  "returning visitors" is meaningless (every session looks new) and is hidden.
- **Minimal**: no stored id. The tracker sends a fresh random id per page load
  only so the schema stays valid; backend skips heartbeat/duration/new-visitor
  bookkeeping.

### Tracker changes (Phase 1)

- `frontend/src/tracker/types.ts`: `TrackerConfig.mode?: 'standard' | 'session' | 'minimal'`.
- `frontend/src/tracker/identity.ts`: replace `getVisitorId(storage, siteId)`
  with a mode-aware resolver over `{ localStorage, sessionStorage }` returning a
  stable-or-ephemeral id. Keeps the existing no-throw behavior.
- `frontend/src/tracker/index.ts`: read `data-ryni-mode`; branch beacon emission
  (minimal → no heartbeat, no `end`); wire the resolver.
- `frontend/src/utils/snippet.ts` + `Snippet.tsx`: emit
  `data-ryni-mode="<mode>"` on both variants.
- Tests: `tracker.test.ts` for the resolver fallback chain and mode branching.

### Backend changes (Phase 1)

- `pb_hooks/lib/ingest.js`: read `tracking_mode` from the loaded `site`. When
  `minimal`, skip `isNewVisitor` (set `is_new_visitor=false`), skip heartbeat
  upsert/remove, skip `applyDuration`. Standard/session behave as today (the
  id is opaque to the backend; the difference is purely client-side).
- `pb_hooks/lib/stats.js`: unchanged. Degenerate metrics in lower tiers are
  naturally zero/empty (no heartbeats → `currentVisitors=0`), and the frontend
  hides them.
- Tests: `ingest.test.ts` cases for minimal mode (no heartbeat row, no
  `is_new_visitor`); `stats.test.ts` unchanged.

### Dashboard changes (Phase 1)

Hide cards based on the site's `tracking_mode` (the dashboard already loads the
`Site` record, so no extra fetch):

| Card                                         | Standard                              | Session                               | Minimal        |
| -------------------------------------------- | ------------------------------------- | ------------------------------------- | -------------- |
| Views                                        | ✓                                     | ✓                                     | ✓              |
| Unique visitors                              | ✓                                     | ✓                                     | ✗              |
| New / Returning visitors                     | ✓                                     | ✗                                     | ✗              |
| Sessions / Pages per session                 | ✓                                     | ✓                                     | ✗              |
| Avg duration / Avg session duration / Bounce | ✓                                     | ✓                                     | ✗              |
| Current (live)                               | ✓                                     | ✓                                     | ✗              |
| Views over time                              | ✓ (views plotted; uniques in tooltip) | ✓ (views plotted; uniques in tooltip) | ✓ (views only) |
| Duration histogram                           | ✓                                     | ✓                                     | ✗              |
| Landing / Exit pages                         | ✓                                     | ✓                                     | ✗              |
| All dimension breakdowns                     | ✓                                     | ✓                                     | ✓              |

The series chart plots views only today (uniques appear only in the tooltip and
`aria-label`), so there is no "unique line" to drop. Minimal suppresses the
unique-visitors figure from the tooltip/aria-label. No new chart line is added
in this change; a separate uniques-over-time line is an optional follow-up, not
part of the tier work.

In Session mode "Unique visitors" and "Sessions" are near-identical (the id is
session-scoped), so relabel "Unique visitors" to "Visitors (per session)" there
to avoid a misleading duplicate.

A small note under the card grid explains what the chosen tier excludes; its
wording adapts per tier (this serves item B — "uniques are per browser profile"
only makes sense for Standard; Session and Minimal get their own phrasing).

### Disclosure (Phase 2)

- `frontend/src/utils/disclosure.ts`: generate, from `tracking_mode` + server +
  site, the copy text and the banner snippet. Text covers: what runs, what's
  stored (per tier), what's _not_ stored (no IP, no cross-site, no profiling),
  basis (legitimate interest Art 6(1)(f), with "record your assessment" note),
  opt-out (Do Not Track), and `<owner>` placeholders for retention + controller
  identity.
- Banner: self-contained HTML+JS; informational only (no consent buttons);
  dismiss stored per the tier (Standard → localStorage, Session/Minimal →
  sessionStorage) so the banner never stores more than tracking does.
- `SiteSettingsDialog.tsx`: a "Privacy & disclosure" section — tier selector,
  disclosure-mode selector, generated copy + banner snippet with copy buttons.
- `site/src/content/docs/`: a "Privacy & GDPR" page: the ePrivacy 5(3) /
  localStorage nuance, GDPR Art 13 transparency, tier table, and the templates.
  Plus the uniques-limitation note (item B).
- README features list + landing copy: mention configurable privacy tiers
  (tagline "no cookies, no fingerprinting" stays true).

### Not legal advice

The disclosure copy is a template with placeholders. Ship it with a note that
final wording is the site owner's responsibility (controller) and DPA
interpretation varies. Rýni does not assert compliance on the owner's behalf.

## What's left to the builder

- Exact `SelectField` values/defaults and migration id/file name.
- Exact copy wording (English first; i18n not in scope).
- Banner styling to match the design tokens; dismissal storage detail.
- Whether the tier selector lives in `SiteSettingsDialog` or `SiteNew` (or
  both), and whether changing tier re-renders the snippet live.
- Test coverage specifics beyond the cases named above.
