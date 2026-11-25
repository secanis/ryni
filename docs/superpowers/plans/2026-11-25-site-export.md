# Per-site Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let site members export raw pageview records as CSV/JSON for the selected range and save the views chart as PNG/JPG.

**Architecture:** A new PocketBase route returns one JSON payload of raw records (no `visitor_id`); the frontend turns it into CSV or JSON and downloads a blob. The chart is exported by cloning the live SVG, inlining computed styles, and rasterizing it on a canvas at 2×.

**Tech Stack:** PocketBase v0.40 JSVM hooks + vitest integration tests; SolidJS + TypeScript + vitest/jsdom; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-25-site-export-design.md`

## Global Constraints

- Never emit `visitor_id`, the PocketBase record `id`, or the `site` relation.
- Export access is exactly: superuser, site manager, or site viewer. Anyone else gets 403.
- `from` and `to` are required on the backend; missing or unparseable → 400.
- CSV column order: `created, path, title, referrer, browser, os, device, screen_size, language, timezone, utm_source, utm_medium, utm_campaign, duration, is_new_visitor`.
- No new npm dependencies.
- Frontend code follows existing style: single quotes, semicolons, 100-column print width, `~/` alias.
- Run frontend checks with `cd frontend && npm test`, `npm run typecheck`, `npm run lint`.
- Backend integration tests need Docker (the harness starts PocketBase at 127.0.0.1:8091).
- Commit after each task; messages use Conventional Commits.

## Review Focus

- A page path or title starting with `=`, `+`, `-`, `@`, tab or CR must not become a live spreadsheet formula — `toCsv` prefixes it with `'` (test in Task 2).
- Records exactly at the `from`/`to` boundaries are included (test in Task 1).
- A range with no records still produces a valid header-only CSV and `records: []` JSON (tests in Tasks 1 and 2).
- Site names with spaces, accents, or symbols must produce a safe download filename (test in Task 2).
- The hover tooltip and transparent hit targets must never appear in the exported image (test in Task 4).

---

### Task 1: Backend raw-records export route

**Files:**
- Create: `pocketbase/pb_hooks/export.pb.js`
- Create: `pocketbase/pb_hooks/lib/export.js`
- Test: `pocketbase/tests/export.test.ts`

**Interfaces:**
- Consumes: `lib/http.js` (`reply`, `replyError`, `getR`, `toMs`), `lib/access.js` (`siteRole`).
- Produces: `GET /api/ryni/sites/{siteId}/export?from=<ISO>&to=<ISO>` returning
  `{ site: { id, name, tracking_id }, from, to, exportedAt, records: SiteExportRecord[] }`,
  records ordered oldest first.

- [ ] **Step 1: Write the failing integration test**

Create `pocketbase/tests/export.test.ts` with this shape (fill in the remaining `it` cases as described below):

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createAdminClient, createUserClient } from './helpers/client';

const rand = () => Math.random().toString(36).slice(2, 8);
const RANGE = { from: '2026-11-01T00:00:00.000Z', to: '2026-11-02T00:00:00.000Z' };

let admin: Awaited<ReturnType<typeof createAdminClient>>;
let owner: Awaited<ReturnType<typeof createUserClient>>;
let viewer: Awaited<ReturnType<typeof createUserClient>>;
let stranger: Awaited<ReturnType<typeof createUserClient>>;
let siteId: string;

beforeAll(async () => {
  admin = await createAdminClient();
  owner = await createUserClient('export-owner');
  viewer = await createUserClient('export-viewer');
  stranger = await createUserClient('export-stranger');
  const s = rand();
  const site = await owner.pb.collection('sites').create({
    name: 'Export Site',
    tracking_id: s,
    endpoint_slug: s,
    allowed_origins: [],
    created_by: owner.userId,
  });
  siteId = site.id;
  await admin.collection('sites').update(siteId, { viewers: [viewer.userId] });
});

function seed(overrides: Record<string, unknown> = {}) {
  return admin.collection('records').create({
    site: siteId,
    visitor_id: 'v-secret',
    path: '/',
    created: '2026-11-01T10:00:00.000Z',
    is_new_visitor: false,
    ...overrides,
  });
}

function exportAs(client: any, query: Record<string, string> = RANGE) {
  return client.send(`/api/ryni/sites/${siteId}/export`, { query });
}
```

- Members get rows mapped to the export shape, sorted by `created` ascending.
- `viewer` (added to `viewers`) gets 200.
- `stranger` gets 403.
- `admin` (superuser) gets 200.
- Missing `from`, and `from: 'not-a-date'`, each get 400.
- A range with no records returns `records: []`.
- A record created exactly at `from` and one exactly at `to` are both included.
- A record with only required fields normalises to `''` strings, `duration: 0`,
  `is_new_visitor: false`.
- Assert `expect(row).not.toHaveProperty('visitor_id')` and
  `expect(JSON.stringify(payload)).not.toContain('v-secret')`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd pocketbase && npx vitest run tests/export.test.ts`
Expected: FAIL — 404/`Route not found` because the route does not exist yet.

- [ ] **Step 3: Implement the route and handler**

Create `pocketbase/pb_hooks/export.pb.js` mirroring `stats.pb.js`:

```js
routerAdd(
  'GET',
  '/api/ryni/sites/{siteId}/export',
  (e) => {
    require(`${__hooks}/lib/export.js`).exportHandler(e);
  },
  $apis.requireAuth(),
);
```

In `pocketbase/pb_hooks/lib/export.js`:

- Copy the auth/membership preamble from `lib/stats.js`: require `e.auth`, use
  `access.siteRole($app, auth.id, siteId)` unless `e.hasSuperuserAuth()`, 404
  when `findRecordById('sites', siteId)` throws.
- Parse `from`/`to` with `toMs`; if either is `0` return
  `fail(e, 400, 'from and to are required')`.
- Load `$app.findRecordsByFilter('records', 'site={:s}', 'created', 0, 0, { s: siteId })`.
  Filter in JS with `toMs(getR(r, 'created'))` against `[fromMs, toMsEnd]` (both inclusive).
- Normalise `created` with `new Date(toMs(raw)).toISOString()`.
- Build each row with this exact key order and coercion:
  `created` (ISO string), the 12 text fields via `String(getR(r, k) || '')`,
  `duration` via `Number(getR(r, 'duration')) || 0`, and `is_new_visitor` via
  `!!getR(r, 'is_new_visitor')`.
- Reply with `http.reply(e, 200, { site: { id, name, tracking_id }, from: ISO(fromMs), to: ISO(toMsEnd), exportedAt: new Date().toISOString(), records })`.

- [ ] **Step 4: Run the backend test to verify it passes**

Run: `cd pocketbase && npx vitest run tests/export.test.ts`
Expected: PASS for every case.

- [ ] **Step 5: Commit**

```bash
git add pocketbase/pb_hooks/export.pb.js pocketbase/pb_hooks/lib/export.js pocketbase/tests/export.test.ts
git commit -m "feat(export): add raw pageview export endpoint"
```

---

### Task 2: Frontend export types and format utilities

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/utils/siteExport.ts`
- Create: `frontend/src/utils/download.ts`
- Test: `frontend/src/utils/siteExport.test.ts`
- Test: `frontend/src/utils/download.test.ts`

**Interfaces:**
- Produces:
  - `SiteExportRecord` and `SiteExportPayload` in `~/types`.
  - `fetchSiteExport(siteId: string, range: { from: string; to: string }): Promise<SiteExportPayload>`
  - `CSV_COLUMNS: readonly (keyof SiteExportRecord)[]`
  - `toCsv(payload: SiteExportPayload): string`
  - `toJson(payload: SiteExportPayload): string`
  - `exportFilename(siteName: string, from: string, to: string, ext: string): string`
  - `downloadBlob(blob: Blob, filename: string): void` from `~/utils/download`.

- [ ] **Step 1: Add the types**

In `frontend/src/types/index.ts` add:

```ts
export interface SiteExportRecord {
  created: string;
  path: string;
  title: string;
  referrer: string;
  browser: string;
  os: string;
  device: string;
  screen_size: string;
  language: string;
  timezone: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  duration: number;
  is_new_visitor: boolean;
}

export interface SiteExportPayload {
  site: { id: string; name: string; tracking_id: string };
  from: string;
  to: string;
  exportedAt: string;
  records: SiteExportRecord[];
}
```

- [ ] **Step 2: Write the failing utility tests**

`frontend/src/utils/siteExport.test.ts` — cover:

- `fetchSiteExport` calls `pb.send('/api/ryni/sites/site1/export', { query: range })`
  (mock `~/services/pocketbase` the same way `stores/stats.test.ts` does).
- Header is exactly the 15 columns in the Global Constraints order.
- Quoting: a path `/,a` is wrapped in quotes; `He said "hi"` becomes
  `"He said ""hi"""`; a title containing `\n` is quoted.
- Formula injection: string cells starting with each of `=`, `+`, `-`, `@`, `\t`
  are prefixed with `'` (e.g. `'=1+1`); numbers are unaffected.
- A payload with `records: []` produces exactly the header line plus `\n`.
- `toJson` round-trips to the same payload and never contains `visitor_id`.
- `exportFilename('Example.COM', '2026-11-18T...', '2026-11-25T...', 'csv')`
  equals `ryni-example-com-2026-11-18_2026-11-25.csv`; `'Rüni Test'` becomes
  `ryni-runi-test-...`; an empty name falls back to `ryni-site-...`.

`frontend/src/utils/download.test.ts` — spy on `URL.createObjectURL`
(`vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')`) and
`HTMLAnchorElement.prototype.click`, then assert `downloadBlob(new Blob(['x']), 'a.csv')`
creates the URL and clicks once.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/utils/siteExport.test.ts src/utils/download.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `siteExport.ts` and `download.ts`**

`siteExport.ts`:

- `fetchSiteExport` = `await pb.send(...) as SiteExportPayload`.
- `CSV_COLUMNS` constant matching the Global Constraints order.
- `toCsv`: map rows to `CSV_COLUMNS`; booleans → `String(v)` (`true`/`false`),
  numbers → `String(v)`, strings passed to `escapeCell`. `escapeCell` prefixes
  `'` when the first char is one of `=+-@`, tab or CR, doubles `"`, and wraps
  when the value contains `,`, `"`, `\n` or `\r`. Join with `\n`, end with `\n`.
- `toJson` = `JSON.stringify(payload, null, 2)`.
- `exportFilename`: `siteName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')`,
  lowercase, replace `[^a-z0-9]+` with `-`, trim `-`, fall back to `site`; dates
  are `from.slice(0, 10)` and `to.slice(0, 10)`; result
  `` `ryni-${slug}-${fromDate}_${toDate}.${ext}` ``.

`download.ts`:

```ts
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/utils/siteExport.test.ts src/utils/download.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/utils/siteExport.ts frontend/src/utils/download.ts frontend/src/utils/siteExport.test.ts frontend/src/utils/download.test.ts
git commit -m "feat(export): add CSV/JSON export helpers"
```

---

### Task 3: Raw-data export in the More menu

**Files:**
- Modify: `frontend/src/components/sites/SiteActionsMenu.tsx`
- Modify: `frontend/src/components/sites/SiteActionsMenu.test.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `fetchSiteExport`, `toCsv`, `toJson`, `exportFilename`, `downloadBlob`.
- Produces: `SiteActionsMenu` props `onExportCsv: () => void` and `onExportJson: () => void`.

- [ ] **Step 1: Update the menu test first**

Extend the mount helper props with `onExportCsv() {}` and `onExportJson() {}`.
Assert the open menu contains **Export CSV** and **Export JSON**, and add a test
that clicking **Export CSV** calls its handler once and closes the menu.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/sites/SiteActionsMenu.test.tsx`
Expected: FAIL — menu lacks the two items.

- [ ] **Step 3: Add the menu items**

Add the two props and render two buttons after **Privacy disclosure**, using the
same `item` class and close-on-click behaviour. Label them exactly
**Export CSV** and **Export JSON**.

- [ ] **Step 4: Wire the Dashboard**

- `const [exportError, setExportError] = createSignal('');`
- `async function exportData(format: 'csv' | 'json')`: set the error to `''`;
  `const payload = await fetchSiteExport(siteId()!, range());` pick body with
  `toCsv`/`toJson`, MIME `text/csv;charset=utf-8` or
  `application/json;charset=utf-8`, and call
  `downloadBlob(new Blob([body], { type }), exportFilename(payload.site.name, payload.from, payload.to, format))`.
  Catch and set `exportError` to `err instanceof Error ? err.message : 'Export failed'`.
- Pass `onExportCsv={() => void exportData('csv')}` and the JSON equivalent to
  `SiteActionsMenu`.
- Render `<Show when={exportError()}><p class="text-xs text-danger">{exportError()}</p></Show>`
  under the header row.

- [ ] **Step 5: Run tests and typecheck**

Run: `cd frontend && npx vitest run src/components/sites/SiteActionsMenu.test.tsx && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/sites/SiteActionsMenu.tsx frontend/src/components/sites/SiteActionsMenu.test.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat(export): add CSV and JSON export to the More menu"
```

---

### Task 4: SVG-to-image utility

**Files:**
- Create: `frontend/src/utils/svgToImage.ts`
- Test: `frontend/src/utils/svgToImage.test.ts`
- Modify: `frontend/src/components/charts/TimeSeries.tsx`
- Modify: `frontend/src/components/charts/TimeSeries.test.tsx`

**Interfaces:**
- Produces:
  - `prepareSvgForExport(svg: SVGSVGElement): SVGSVGElement`
  - `svgToBlob(svg: SVGSVGElement, opts: { type: 'image/png' | 'image/jpeg'; scale?: number; background?: string }): Promise<Blob>`
- `TimeSeries` gains optional prop `onSvg?: (el: SVGSVGElement) => void`.

- [ ] **Step 1: Write the failing tests**

`svgToImage.test.ts`:

- Build an `<svg viewBox="0 0 100 50">` containing a `<rect data-export-hide>`
  and a `<path style="fill: rgb(1, 2, 3)" class="x">`; call
  `prepareSvgForExport`; assert the result is a different node, the hidden rect
  is gone, the path keeps its fill (either the inline `style` or a `fill`
  attribute resolves to `rgb(1, 2, 3)`), and `xmlns="http://www.w3.org/2000/svg"`
  is set.
- Stub `HTMLCanvasElement.prototype.getContext` with
  `{ fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '' }`,
  `HTMLCanvasElement.prototype.toBlob` with
  `(cb, type) => cb(new Blob(['x'], { type }))`, and `globalThis.Image` with a
  class whose `src` setter calls `onload`. Then assert
  `await svgToBlob(svg, { type: 'image/jpeg' })` resolves to a `Blob` whose type
  is `image/jpeg`. Restore stubs in `afterEach`.

`TimeSeries.test.tsx` add: the rendered hover group and every invisible hit
`rect` carry `data-export-hide`; `onSvg` receives the chart `<svg>` element.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/utils/svgToImage.test.ts src/components/charts/TimeSeries.test.tsx`
Expected: FAIL — module/prop missing.

- [ ] **Step 3: Implement `svgToImage.ts`**

- `prepareSvgForExport`: clone with `cloneNode(true)`; copy `fill`, `stroke`,
  `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `stroke-dasharray`,
  `fill-opacity`, `stroke-opacity`, `opacity`, `stop-color`, `stop-opacity`,
  `font-family`, `font-size`, `font-weight`, `text-anchor`, `display` and
  `visibility` from each original element to the same-index clone element using
  `getComputedStyle`; then remove `[data-export-hide]` from the clone; set
  `xmlns`, and `width`/`height` from the `viewBox` dimensions.
- `svgToBlob`: parse `viewBox` (`0 0 W H`) with a fallback to 600×192; create a
  canvas at `W*scale` by `H*scale` (scale default 2); fill with `background`
  (default `#ffffff`); serialize the prepared clone with `XMLSerializer`;
  `Image.src = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))`;
  on load, `drawImage(img, 0, 0, canvas.width, canvas.height)`, revoke the URL,
  and resolve `canvas.toBlob(cb, opts.type, 0.92)`; reject on image error.

- [ ] **Step 4: Mark chart internals and expose the SVG**

In `TimeSeries.tsx`:

- Pass `onSvg` through `TimeSeries` → `FullSeries` and attach
  `ref={(el) => props.onSvg?.(el)}` to the chart `<svg>`.
- Add `data-export-hide` to the hover `<g>` and to each invisible hit-target
  `<rect>`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/utils/svgToImage.test.ts src/components/charts/TimeSeries.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/svgToImage.ts frontend/src/utils/svgToImage.test.ts frontend/src/components/charts/TimeSeries.tsx frontend/src/components/charts/TimeSeries.test.tsx
git commit -m "feat(export): add SVG rasterizing helper"
```

---

### Task 5: Chart image export control

**Files:**
- Create: `frontend/src/components/charts/ChartExportMenu.tsx`
- Test: `frontend/src/components/charts/ChartExportMenu.test.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `svgToBlob`, `downloadBlob`, `exportFilename`.
- Produces: `ChartExportMenu(props: { onExport: (type: 'png' | 'jpeg') => void })`.

- [ ] **Step 1: Write the failing component test**

Mount the menu with a handler spy. Assert it starts closed; clicking the
**Export** button reveals **PNG** and **JPG**; clicking **PNG** calls the handler
with `'png'` and closes; clicking **JPG** calls it with `'jpeg'`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/charts/ChartExportMenu.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the menu**

Mirror `SiteActionsMenu`'s dropdown pattern: a small bordered **Export** button
(with a `Download` icon), a fixed overlay to close, and two items.
Props `onExport: (type: 'png' | 'jpeg') => void`.

- [ ] **Step 4: Wire the chart card in the Dashboard**

- `let chartSvg: SVGSVGElement | undefined;`
- Pass `onSvg={(el) => (chartSvg = el)}` to the `TimeSeries` in the
  "Views over time" card.
- `async function exportChart(type: 'png' | 'jpeg')`: guard on `chartSvg` and
  `site()`; call
  `svgToBlob(chartSvg, { type: `image/${type}`, background: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff' })`;
  download as `exportFilename(site()!.name, range().from, range().to, type === 'png' ? 'png' : 'jpg')`;
  catch into `exportError`.
- Change the card header to
  `<div class="flex items-center justify-between mb-3"><h3 class="font-medium">Views over time</h3><ChartExportMenu onExport={(t) => void exportChart(t)} /></div>`.

- [ ] **Step 5: Run the full frontend suite and checks**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: all tests pass, no type or lint errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/charts/ChartExportMenu.tsx frontend/src/components/charts/ChartExportMenu.test.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat(export): add PNG and JPG chart export"
```

---

## Final verification

- [ ] `cd pocketbase && npm test` — all backend suites pass.
- [ ] `cd frontend && npm test && npm run typecheck && npm run lint` — all green.
- [ ] Manually confirm in the running app: CSV/JSON downloads contain no
  `visitor_id`, filenames match the range, and PNG/JPG exports omit the tooltip.
