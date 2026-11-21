# Rýni Privacy Tiers & Disclosure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each Rýni site a configurable privacy tier (Standard / Session / Minimal) plus a generated transparency disclosure (text + dismissible banner), and fix private-mode unique-visitor inflation.

**Architecture:** A per-site `tracking_mode` field drives three things: the client tracker's id storage (localStorage / sessionStorage / none), the ingest handler's bookkeeping (heartbeat/duration/new-visitor only when an id exists), and the dashboard's card visibility. A `disclosure_mode` field drives generated copy (privacy-policy text and a self-contained banner) whose wording is derived from the tier. No new dependencies; no cookies; no fingerprinting.

**Tech Stack:** SolidJS + TypeScript (Vite/Vitest) frontend; PocketBase JSVM hooks + migrations (Vitest, Docker-backed); esbuild IIFE for the tracker.

**Spec:** `docs/superpowers/specs/2026-11-21-privacy-tiers-and-disclosure-design.md`

## Global Constraints

- `tracking_mode` values are exactly `standard` | `session` | `minimal`; empty/missing/garbage = `standard`.
- `disclosure_mode` values are exactly `none` | `text` | `banner`; empty/missing = `none`.
- No new runtime dependencies. No cookies anywhere. No fingerprinting. Tracker and banner make no external requests.
- Tracker stays a self-contained IIFE (`frontend/public/ryni.js`) built by `node scripts/build-tracker.mjs`; `npm run build` runs typecheck + tracker build + vite build.
- Copy is English only; no i18n. New UI uses existing design tokens (`bg-surface`, `rounded-radius-card`, `border-border`, `text-muted`, etc.).
- TypeScript strict: `npm run typecheck` must pass.
- Phase 1 is independently shippable (tiers work without disclosure). Phase 2 adds disclosure + docs.

## Review Focus

Input classes the spec implies but no single task's tests would otherwise catch, most likely first:

1. **Legacy/empty `tracking_mode`** must behave as Standard in every read path (ingest, dashboard, snippet). A pre-migration site or a site created without the field must not silently lose heartbeat/duration or hide cards. → Tasks 2, 8.
2. **Unknown/garbage `data-ryni-mode`** on the tracker must fall back to Standard, not throw or send nothing. → Task 3.
3. **Blocked `localStorage` in Standard tier** must fall back to `sessionStorage` so a private-mode visitor keeps one id across page loads (the whole point of the fix). → Task 3.
4. **Minimal tier must ignore `heartbeat`/`end` beacons** (e.g. a cached old tracker still sending them) — no heartbeat rows, no duration written. → Task 8.
5. **Minimal-tier banner dismissal must use `sessionStorage`, never `localStorage`**, or the "stores nothing" claim is false. → Task 9.

---

## Phase 1 — Tiers

### Task 1: Migration — `tracking_mode` + `disclosure_mode` fields

**Files:**
- Create: `pocketbase/pb_migrations/1740000005_add_privacy_settings.js`
- Test: `pocketbase/tests/collections.test.ts` (extend)

**Interfaces:**
- Produces: `sites.tracking_mode` (`SelectField`, values `['standard','session','minimal']`, `maxSelect: 1`, not required) and `sites.disclosure_mode` (`SelectField`, values `['none','text','banner']`, `maxSelect: 1`, not required), both backfilled (`standard`/`none`) on existing rows.

- [ ] **Step 1: Write the failing test** — in `collections.test.ts`, add a describe asserting, via an admin client:
  - `sites` collection exposes `tracking_mode` and `disclosure_mode` fields (inspect `admin.collection('sites').getOne(...)` after a create).
  - a site created with `tracking_mode: 'minimal'` reads back `'minimal'`.
  - a site created without `tracking_mode` is allowed (create returns success; field is empty).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd pocketbase && npx vitest run tests/collections.test.ts`
Expected: FAIL — create with `tracking_mode: 'minimal'` rejected (unknown field) or field missing.

- [ ] **Step 3: Implement the migration**

Follow the existing `1740000000_create_ryni_collections.js` style: `app.findCollectionByNameOrId('sites')`, add each field only if `sites.fields.getByName(name)` is missing, `app.save(sites)`, then backfill with raw SQL:

```js
new SelectField({ name: 'tracking_mode', values: ['standard','session','minimal'], maxSelect: 1, required: false })
new SelectField({ name: 'disclosure_mode', values: ['none','text','banner'], maxSelect: 1, required: false })
```

Backfill via `app.db().newQuery("UPDATE sites SET tracking_mode='standard' WHERE tracking_mode='' OR tracking_mode IS NULL").execute()` (and `disclosure_mode='none'`), each wrapped in try/catch logging like the existing `addIndex`. Rollback callback is a no-op.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd pocketbase && npx vitest run tests/collections.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pocketbase/pb_migrations/1740000005_add_privacy_settings.js pocketbase/tests/collections.test.ts
git commit -m "feat(privacy): add tracking_mode and disclosure_mode site fields"
```

### Task 2: Frontend types + `trackingModeOf` helper

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/utils/privacy.ts`
- Test: `frontend/src/utils/privacy.test.ts`

**Interfaces:**
- Produces: `TrackingMode = 'standard' | 'session' | 'minimal'`, `DisclosureMode = 'none' | 'text' | 'banner'`, `Site.tracking_mode?: TrackingMode`, `Site.disclosure_mode?: DisclosureMode`, and `trackingModeOf(mode: string | null | undefined): TrackingMode`.

- [ ] **Step 1: Write the failing test** — `privacy.test.ts`:

```ts
import { trackingModeOf } from './privacy';
expect(trackingModeOf(undefined)).toBe('standard');
expect(trackingModeOf('')).toBe('standard');
expect(trackingModeOf('garbage')).toBe('standard');
expect(trackingModeOf('session')).toBe('session');
expect(trackingModeOf('minimal')).toBe('minimal');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/privacy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — add the two type aliases to `types/index.ts`, add the optional fields to `Site`, and implement `trackingModeOf` in `utils/privacy.ts` returning `standard` for anything other than `'session'`/`'minimal'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/privacy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/utils/privacy.ts frontend/src/utils/privacy.test.ts
git commit -m "feat(privacy): add tracking/disclosure types and trackingModeOf helper"
```

### Task 3: Tracker — mode-aware visitor id + `data-ryni-mode`

**Files:**
- Modify: `frontend/src/tracker/types.ts`
- Modify: `frontend/src/tracker/identity.ts`
- Modify: `frontend/src/tracker/index.ts`
- Test: `frontend/src/tracker/tracker.test.ts` (rewrite identity section)

**Interfaces:**
- Consumes: nothing new.
- Produces: `tracker/types.ts` exports `TrackingMode = 'standard' | 'session' | 'minimal'` and `normalizeMode(raw: string | null | undefined): TrackingMode`; `TrackerConfig.mode: TrackingMode`. `identity.ts` exports `resolveVisitorId(stores: { localStorage?: StorageLike | null; sessionStorage?: StorageLike | null }, siteId: string, mode: TrackingMode): string` where `StorageLike = Pick<Storage, 'getItem' | 'setItem'>`. `getVisitorId` is removed.

- [ ] **Step 1: Write the failing tests** — replace the `identity` describe in `tracker.test.ts`. Extend `fakeStorage` with an optional `blocked` flag that makes `setItem` throw. Assert:

  - `normalizeMode('session') === 'session'`, `normalizeMode('minimal') === 'minimal'`, `normalizeMode('garbage') === 'standard'`, `normalizeMode(undefined) === 'standard'`.
  - standard + working localStorage: `resolveVisitorId({ localStorage: s }, 'siteA', 'standard')` is stable across calls, distinct across sites.
  - standard + blocked localStorage (localStorage `setItem` throws, sessionStorage works): two calls with the same `sessionStorage` return the same id (fallback path).
  - session: reads sessionStorage only — a value already in sessionStorage is returned even when localStorage has a different value.
  - minimal: two calls return different ids and neither storage's map is written to.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/tracker/tracker.test.ts`
Expected: FAIL — `resolveVisitorId`/`normalizeMode` not defined.

- [ ] **Step 3: Implement `resolveVisitorId` and `normalizeMode`**

`normalizeMode` returns `'session'`/`'minimal'` for those exact strings, else `'standard'`. `resolveVisitorId` keys on `'ryni_visitor_' + siteId`:

- `minimal` → `generateId()` (no storage).
- `session` → `getOrCreate([sessionStorage])`.
- `standard` → `getOrCreate([localStorage, sessionStorage])`.

`getOrCreate(stores, key)`: read each store in order, return the first hit; otherwise `generateId()`, write to each store in order until one succeeds, return the id (ephemeral if all fail). No throw escapes.

- [ ] **Step 4: Implement `index.ts` wiring** — `readConfig()` reads `data-ryni-mode`, stores `mode: normalizeMode(el?.getAttribute('data-ryni-mode'))`; build the visitor via `resolveVisitorId({ localStorage: window.localStorage, sessionStorage: window.sessionStorage }, cfg.site, cfg.mode)`. In `start()`, gate the heartbeat interval, `visibilitychange`, and `pagehide` listeners (and `endSession` calls) behind `cfg.mode !== 'minimal'`.

- [ ] **Step 5: Run tests + build**

Run: `cd frontend && npx vitest run src/tracker/tracker.test.ts && npm run build`
Expected: tests PASS; build writes `public/ryni.js` without typecheck errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/tracker/types.ts frontend/src/tracker/identity.ts frontend/src/tracker/index.ts frontend/src/tracker/tracker.test.ts frontend/public/ryni.js
git commit -m "feat(privacy): mode-aware visitor id and data-ryni-mode in tracker"
```

### Task 4: Snippet — emit `data-ryni-mode`

**Files:**
- Modify: `frontend/src/utils/snippet.ts`
- Test: `frontend/src/utils/snippet.test.ts` (extend)

**Interfaces:**
- Consumes: `TrackingMode` from `~/types`.
- Produces: `SnippetInput.mode?: TrackingMode`; `buildSnippets` adds ` data-ryni-mode="<mode>"` to both variants **only when** `mode` is `'session'` or `'minimal'` (Standard stays byte-identical to today).

- [ ] **Step 1: Write the failing tests** — assert:
  - `buildSnippets({ server, site, mode: 'standard' })` returns variants with no `data-ryni-mode`.
  - `buildSnippets({ server, site, mode: 'session' })` variants contain `data-ryni-mode="session"`.
  - `buildSnippets({ server, site, mode: 'minimal' })` variants contain `data-ryni-mode="minimal"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/snippet.test.ts`
Expected: FAIL — no `mode` on input, no attribute emitted.

- [ ] **Step 3: Implement** — add `mode?: TrackingMode` to `SnippetInput`; compute `modeAttr` and insert it before `${detailed}` in both `variantA` and `variantB`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/snippet.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/snippet.ts frontend/src/utils/snippet.test.ts
git commit -m "feat(privacy): emit data-ryni-mode in tracking snippets"
```

### Task 5: Sites store — persist `tracking_mode`

**Files:**
- Modify: `frontend/src/stores/sites.ts`

**Interfaces:**
- Consumes: `TrackingMode` from `~/types`.
- Produces: `sitesStore.create` accepts `tracking_mode?: TrackingMode` and sends `tracking_mode: data.tracking_mode ?? 'standard'`; `sitesStore.update(id, data)` accepts `tracking_mode?: TrackingMode` and passes it through.

- [ ] **Step 1: Implement** — extend the `create` param type and spread it, and widen `update`'s `data` param to `{ name: string; allowed_origins: string[]; tracking_mode?: TrackingMode }`, passing `tracking_mode` only when present.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/sites.ts
git commit -m "feat(privacy): persist tracking_mode in sites store"
```

### Task 6: Dashboard — hide/relabel cards, series uniques flag, tier note

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/components/charts/TimeSeries.tsx`
- Test: `frontend/src/components/charts/TimeSeries.test.tsx` (extend)

**Interfaces:**
- Consumes: `trackingModeOf` (Task 2), `site.tracking_mode`.
- Produces: `TimeSeries` gains optional prop `showUniques?: boolean` (default `true`); when `false`, `FullSeries` tooltip reads `"{views} views"` and the hover-rect `aria-label` reads `"{date}: {views} views"` (no `visitors`). Dashboard renders only tier-appropriate cards and breakdowns.

- [ ] **Step 1: Write the failing test** — in `TimeSeries.test.tsx`, render `<TimeSeries points={[{ date: '2026-11-21', views: 5, uniqueVisitors: 2 }]} showUniques={false} />` and assert the tooltip/aria text for the single point is `"5 views"` with no `visitors` substring; and with `showUniques` omitted (default) it contains `"5 views · 2 visitors"` (or the aria-label equivalent).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/charts/TimeSeries.test.tsx`
Expected: FAIL — `showUniques` not honored.

- [ ] **Step 3: Implement `TimeSeries`** — thread `showUniques` from `TimeSeries` → `FullSeries`; guard the `metricsStr` and the hover `aria-label`.

- [ ] **Step 4: Implement `Dashboard`** — add `const mode = () => trackingModeOf(site()?.tracking_mode);`. Replace the ten static `<StatCard>`s with a memo-driven list filtered by mode:

  - Views — all tiers.
  - Unique visitors (label `"Visitors (per session)"` when `mode()==='session'`) — standard, session.
  - New visitors — standard.
  - Returning visitors — standard.
  - Sessions — standard, session.
  - Avg duration — standard, session.
  - Avg session duration — standard, session.
  - Bounce rate — standard, session.
  - Pages / session — standard, session.
  - Current — standard, session.

  Wrap `Duration`, `Landing pages`, and `Exit pages` `<Breakdown>`s in `<Show when={mode() !== 'minimal'}>`. Pass `showUniques={mode() !== 'minimal'}` to `<TimeSeries>`. Add a `<p class="text-xs text-muted">` note under the card grid whose text depends on `mode()` (Standard: unique visitors are per browser profile and reset when browsing data is cleared; Session: visits are measured per browsing session, so returning-visitor counts aren't tracked; Minimal: only page views and device/browser breakdowns are recorded — nothing is stored on visitors' devices).

- [ ] **Step 5: Run tests + typecheck + build**

Run: `cd frontend && npx vitest run src/components/charts/TimeSeries.test.tsx && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx frontend/src/components/charts/TimeSeries.tsx frontend/src/components/charts/TimeSeries.test.tsx
git commit -m "feat(privacy): tier-aware dashboard cards and series"
```

### Task 7: Site settings / new-site — tier selector

**Files:**
- Modify: `frontend/src/components/sites/SiteSettingsDialog.tsx`
- Modify: `frontend/src/pages/SiteNew.tsx`

**Interfaces:**
- Consumes: `sitesStore.create`/`update` with `tracking_mode` (Task 5), `TrackingMode`.
- Produces: a `<select>` bound to `tracking_mode` (options Standard / Session / Minimal), included in `save()`; new sites default to `standard`.

- [ ] **Step 1: Implement** — in `SiteSettingsDialog`, add a `tracking_mode` signal seeded from `props.site.tracking_mode ?? 'standard'`, render a labelled `<select>` with the three options, and include `tracking_mode: trackingMode()` in the `update` call. In `SiteNew`, pass `tracking_mode: 'standard'` to `create`.

- [ ] **Step 2: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/sites/SiteSettingsDialog.tsx frontend/src/pages/SiteNew.tsx
git commit -m "feat(privacy): tier selector in site settings and creation"
```

### Task 8: Ingest — Minimal tier bookkeeping

**Files:**
- Modify: `pocketbase/pb_hooks/lib/ingest.js`
- Test: `pocketbase/tests/ingest.test.ts` (extend)

**Interfaces:**
- Consumes: `site.get('tracking_mode')`.
- Produces: `ingest.js` treats a `minimal` site as: no heartbeat upsert/remove, no `applyDuration`, `is_new_visitor` forced `false`. Standard/session behave as today.

- [ ] **Step 1: Write the failing tests** — extend `makeSite` to accept an optional `mode`, or add a `makeSiteMode(mode)`. Assert for a `minimal` site:
  - a `view` post returns 204 and the record has `is_new_visitor === false`, `path` set.
  - a `heartbeat` post returns 204 and `heartbeats` has **no** row for that visitor.
  - a `view` followed by an `end` with `duration: 42` returns 204 and the record's `duration` is **not** `42` (unset).
  - regression: a `standard`-mode site still writes `is_new_visitor: true` on first view (existing test covers; keep it green).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd pocketbase && npx vitest run tests/ingest.test.ts`
Expected: FAIL — minimal mode not honored (heartbeat row exists / duration applied / is_new_visitor true).

- [ ] **Step 3: Implement** — near the top of `handler` after `site` is loaded, compute `var minimal = (str(site.get('tracking_mode'), 20) || 'standard') === 'minimal';`. Guard `upsertHeartbeat`/`removeHeartbeat`/`applyDuration` calls and the `is_new_visitor` assignment (`minimal ? false : isNewVisitor(...)`) behind `!minimal`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd pocketbase && npx vitest run tests/ingest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pocketbase/pb_hooks/lib/ingest.js pocketbase/tests/ingest.test.ts
git commit -m "feat(privacy): minimal tier skips heartbeat, duration and new-visitor"
```

---

## Phase 2 — Disclosure + docs

### Task 9: Disclosure generator — text + banner

**Files:**
- Create: `frontend/src/utils/disclosure.ts`
- Test: `frontend/src/utils/disclosure.test.ts`

**Interfaces:**
- Consumes: `TrackingMode` from `~/types`.
- Produces: `disclosureText(input: { mode: TrackingMode; siteName?: string }): string` and `bannerSnippet(input: { mode: TrackingMode; privacyUrl?: string }): string`.

**Canonical copy** (implement exactly; `[retention period]` and `[controller name and contact]` are literal placeholders the owner edits):

- Standard text: "This website uses Rýni, a self-hosted privacy-friendly analytics tool. To count unique visits, Rýni stores a random identifier in your browser's local storage (no cookies are used). It records the pages you view, the referring site, your browser and device type, screen size, language, time zone, and the time spent on each page. No IP address is stored, no cross-site tracking is performed, and the data never leaves this server. The legal basis is legitimate interest (Art. 6(1)(f) GDPR) in understanding how this site is used. You can object at any time by enabling the 'Do Not Track' setting in your browser. Data is retained for [retention period]. Controller: [controller name and contact]."
- Session text: same skeleton, but the second sentence becomes "To measure a single visit, Rýni stores a temporary random identifier for the duration of your visit only (nothing persistent)."
- Minimal text: second sentence becomes "Rýni stores nothing on your device and cannot link your visits together. It records only anonymous page views together with your browser and device type."

Banner = self-contained `<div>` + inline `<script>`: a fixed bottom bar with a one-line tier summary ("This site uses privacy-friendly analytics." / "This site measures visits with a temporary, non-persistent identifier." / "This site counts anonymous page views — nothing is stored on your device."), an optional "Learn more" link when `privacyUrl` is set, and a dismiss button. Dismissal key `ryni_disclosure_dismissed`: `localStorage` for `standard`, `sessionStorage` for `session` and `minimal`. No consent buttons, no external requests.

- [ ] **Step 1: Write the failing tests** — assert:
  - `disclosureText({ mode: 'standard' })` contains `local storage`, `no cookies`, `legitimate interest`, `[retention period]`, `[controller name and contact]`.
  - `disclosureText({ mode: 'session' })` contains `temporary`/`duration of your visit` and not `local storage`.
  - `disclosureText({ mode: 'minimal' })` contains `stores nothing` and `cannot link`.
  - `bannerSnippet({ mode: 'minimal' })` contains `sessionStorage` and not `localStorage`; `bannerSnippet({ mode: 'standard' })` contains `localStorage`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/disclosure.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `disclosure.ts` per the canonical copy and banner spec above.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/disclosure.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/disclosure.ts frontend/src/utils/disclosure.test.ts
git commit -m "feat(privacy): disclosure text and banner generators"
```

### Task 10: Site settings — disclosure section

**Files:**
- Modify: `frontend/src/components/sites/SiteSettingsDialog.tsx`
- Modify: `frontend/src/stores/sites.ts`

**Interfaces:**
- Consumes: `disclosureText`/`bannerSnippet` (Task 9), `DisclosureMode`, `sitesStore.update` with `disclosure_mode`.

- [ ] **Step 1: Implement** — widen `sitesStore.update`'s data param to include `disclosure_mode?: DisclosureMode` (pass through when present). In `SiteSettingsDialog`, add a `disclosure_mode` signal seeded from `props.site.disclosure_mode ?? 'none'`, a `<select>` (None / Text / Banner), and, when the mode is not `none`, a "Privacy disclosure" block rendering `disclosureText({ mode: trackingMode() })` and `bannerSnippet({ mode: trackingMode() })` in `<pre>` with `CopyButton`s. Include `disclosure_mode` in `save()`.

- [ ] **Step 2: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/sites/SiteSettingsDialog.tsx frontend/src/stores/sites.ts
git commit -m "feat(privacy): disclosure settings and generated copy in site dialog"
```

### Task 11: Docs + README

**Files:**
- Create: `site/src/content/docs/docs/privacy.md` (or nearest existing docs section; follow the Starlight content tree)
- Modify: `README.md`

**Interfaces:** none.

- [ ] **Step 1: Write the docs page** — a "Privacy & GDPR" page covering: the three tiers and their device-storage semantics; the ePrivacy Art 5(3) note that `localStorage` is device storage; the GDPR Art 13 transparency duty (controller vs processor, DNT as opt-out); the tier→metrics table; the disclosure copy templates; and the "not legal advice, wording is the owner's responsibility" caveat. Include the item-B note: unique visitors are per browser profile and reset when storage is cleared.

- [ ] **Step 2: Update README** — under `## Features`, add one line: "Configurable privacy tiers (Standard / Session / Minimal) with generated GDPR disclosure text and an optional banner."

- [ ] **Step 3: Build the docs site**

Run: `cd site && npm run build` (or the repo's site build command; check `site/package.json`)
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add site/src/content/docs/docs/privacy.md README.md
git commit -m "docs(privacy): GDPR/privacy page and README tier note"
```

---

## Self-review notes

- Spec coverage: every design-doc section maps to a task — data model (1), types/helper (2), tracker (3), snippet (4), store (5), dashboard (6), settings UI (7), ingest (8), disclosure (9–10), docs (11). FingerprintJS/cookie rejection is recorded in the spec, not built.
- Review Focus items 1–5 are each pinned to a test in Tasks 2, 3, 8, 9.
- Type consistency: `TrackingMode` is defined once in `frontend/src/types/index.ts` (app code) and independently in `frontend/src/tracker/types.ts` (standalone bundle); `trackingModeOf`/`normalizeMode` are the two normalizers and both map unknown → `standard`.
