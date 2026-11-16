# Rýni Design Language — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Rýni's default-slate look with the two-theme (Polar Night / Glacier) Iceland-derived design language, tokenized in Tailwind, with the time-series rewritten to an aurora-gradient line + area.

**Architecture:** Design tokens live as CSS custom properties on `:root` (light) and `.dark` (dark) in `index.css`, surfaced into Tailwind as semantic color names (`bg`, `surface`, `text`, `muted`, `accent`, …). Components swap raw `slate-*` utilities for these tokens. Fonts (Sora / Inter / JetBrains Mono) are bundled via `@fontsource` (self-hosted — no runtime external requests). The chart change is the only behavior change: `TimeSeries` renders a line + area instead of bars; `Breakdown` bars cycle a categorical ramp.

**Tech Stack:** SolidJS, Tailwind CSS v3 (`darkMode:'class'`), Vite, Vitest + jsdom + solid testing (`render` from `solid-js/web`).

**Spec:** `docs/superpowers/specs/2026-11-16-ryni-design-language.md`

## Global Constraints

- No raw hex in any component or page — hex only inside the `:root` / `.dark` blocks in `src/index.css`. Components use token utilities (`bg-surface`, `text-muted`, `border-border`, `bg-accent`, …).
- Theme switching is unchanged: `stores/theme.ts` toggles the `dark` class on `<html>`; default mode stays `system`. Do not touch `theme.ts`.
- Fonts delivered via `@fontsource` packages imported in `src/index.tsx` (bundled, self-hosted). No `<link>` to Google Fonts, no `public/fonts/` vendoring.
- Radius uses new names (`radius-sm` 8px, `radius-card` 12px, `radius-shell` 18px, `radius-pill` 999px); Tailwind default radius scale is left untouched so existing `rounded-lg` doesn't silently jump.
- No new components. Inline Tailwind utilities stay inline (no `Button`/`Input` refactor).
- Categorical ramp = `--series-1`…`--series-8`; breakdown bars cycle `i % 8`.

## Review Focus

The failure modes the spec implies but no single task's happy-path test covers:

1. **Duplicate SVG gradient IDs** — the dashboard shows many `Breakdown`s and every site card shows a `MiniSeries`; two `TimeSeries` instances on one page must not share a gradient `id` (would break fills). → Task 2 test: render two charts together, assert distinct gradient ids.
2. **Empty / single-point series** — a brand-new site has 0 or 1 data points; line + area path math must not produce `NaN` or throw. → Task 2 test: render `[]` and one-point series, assert no throw.
3. **Ramp wrap past 8** — a breakdown with 9+ items must wrap (`i % 8`), not drop to undefined color for item 9. → Task 2 test: 9-item breakdown, 9th fill still has a `--series-` background.
4. **Theme switch actually recolors** — tokens must be on `:root` vs `.dark` (not hardcoded); verify both themes render distinct surfaces. → Task 1 verify step (visual, jsdom can't compute styles).
5. **Accent-button contrast in both themes** — dark theme's bright-green button needs dark text, light theme's deep-green button needs white text (the `accent-fg` token). → Task 1 verify step (visual in both themes).

---

## File Structure

- `frontend/src/index.css` — `:root`/`.dark` token blocks, body defaults, `@fontsource`-independent base heading rule. (Task 1)
- `frontend/tailwind.config.js` — maps token CSS vars into `colors`, sets `fontFamily`, adds `borderRadius` names. (Task 1)
- `frontend/src/index.tsx` — imports `@fontsource` CSS. (Task 1)
- `frontend/src/components/charts/TimeSeries.tsx` — line + area rewrite (+ `MiniSeries`). (Task 2)
- `frontend/src/components/charts/TimeSeries.test.tsx` — rewritten to describe line + area. (Task 2)
- `frontend/src/components/charts/Breakdown.tsx` — bars cycle `--series-1..8`. (Task 2)
- `frontend/src/components/charts/Breakdown.test.tsx` — add ramp-cycle test. (Task 2)
- Layout + shared UI + auth pages (Task 3): `layout/Shell.tsx`, `layout/UserMenu.tsx`, `ui/CopyButton.tsx`, `dashboard/StatCard.tsx`, `dashboard/DateRange.tsx`, `App.tsx`, `pages/Login.tsx`, `pages/Setup.tsx`.
- Feature pages + dialogs + admin (Task 4): `pages/Sites.tsx`, `pages/SiteNew.tsx`, `pages/Dashboard.tsx`, `pages/Settings.tsx`, `pages/About.tsx`, `pages/admin/Users.tsx`, `sites/SiteCard.tsx`, `sites/Snippet.tsx`, `sites/ShareDialog.tsx`, `sites/SiteSettingsDialog.tsx`, `settings/OidcForm.tsx`, `settings/BackupPanel.tsx`.

---

### Task 1: Design tokens + typography foundation

**Files:**
- Create: (none)
- Modify: `frontend/tailwind.config.js`, `frontend/src/index.css`, `frontend/src/index.tsx`, `frontend/package.json` (deps via npm)

**Interfaces:**
- Produces: Tailwind color utilities `bg`, `surface`, `surface-2`, `border`, `border-strong`, `text`, `muted`, `faint`, `accent`, `accent-2`, `accent-3`, `accent-fg`, `warn`, `danger`, `series-1`…`series-8`; font utilities `font-display`, `font-sans` (Inter), `font-mono` (JetBrains Mono); radius utilities `radius-sm/card/shell/pill`. Later tasks consume these.

- [ ] **Step 1: Install font packages**

Run: `cd frontend && npm install @fontsource/inter @fontsource/sora @fontsource/jetbrains-mono`
Expected: three packages added to `package.json`.

- [ ] **Step 2: Write the token blocks in `src/index.css`**

Replace the file's `body` rule and add the token blocks. `.dark` MUST follow `:root` (equal specificity — order wins):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #F3F5FB;
  --surface: #FFFFFF;
  --surface-2: #EEF1F8;
  --border: #E1E6F0;
  --border-strong: #CBD3E2;
  --text: #171C2E;
  --muted: #64708C;
  --faint: #96A0B8;
  --accent: #0BA477;
  --accent-2: #0284C7;
  --accent-3: #7C3AED;
  --warn: #E5641B;
  --danger: #DB2777;
  --accent-fg: #FFFFFF;
  --series-1: #0BA477;
  --series-2: #0284C7;
  --series-3: #7C3AED;
  --series-4: #E5641B;
  --series-5: #DB2777;
  --series-6: #65A30D;
  --series-7: #475569;
  --series-8: #B45309;
}

.dark {
  --bg: #0D1120;
  --surface: #151A2D;
  --surface-2: #1C2339;
  --border: #262D45;
  --border-strong: #333B58;
  --text: #E8ECF6;
  --muted: #98A0BA;
  --faint: #6B7390;
  --accent: #4EE6A8;
  --accent-2: #6FD3F7;
  --accent-3: #A58BFF;
  --warn: #FF9E64;
  --danger: #FF7AB6;
  --accent-fg: #0D1120;
  --series-1: #4EE6A8;
  --series-2: #6FD3F7;
  --series-3: #A58BFF;
  --series-4: #FF9E64;
  --series-5: #FF7AB6;
  --series-6: #B8E06A;
  --series-7: #8FA3C8;
  --series-8: #FFD166;
}

@layer base {
  h1, h2, h3, h4 { @apply font-display; }
}

body {
  @apply bg-bg text-text;
}
```

Note: `accent-fg` (text color on the accent button) is a builder addition not in the spec's table — dark theme accent is bright so its foreground is near-black `#0D1120`; light theme accent is deep so its foreground is white.

- [ ] **Step 3: Map tokens into `tailwind.config.js`**

Replace the `theme.extend` block:

```js
theme: {
  extend: {
    colors: {
      bg: 'var(--bg)',
      surface: 'var(--surface)',
      'surface-2': 'var(--surface-2)',
      border: 'var(--border)',
      'border-strong': 'var(--border-strong)',
      text: 'var(--text)',
      muted: 'var(--muted)',
      faint: 'var(--faint)',
      accent: 'var(--accent)',
      'accent-2': 'var(--accent-2)',
      'accent-3': 'var(--accent-3)',
      'accent-fg': 'var(--accent-fg)',
      warn: 'var(--warn)',
      danger: 'var(--danger)',
      series: {
        1: 'var(--series-1)',
        2: 'var(--series-2)',
        3: 'var(--series-3)',
        4: 'var(--series-4)',
        5: 'var(--series-5)',
        6: 'var(--series-6)',
        7: 'var(--series-7)',
        8: 'var(--series-8)',
      },
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      display: ['Sora', 'Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    borderRadius: {
      'radius-sm': '8px',
      'radius-card': '12px',
      'radius-shell': '18px',
      'radius-pill': '999px',
    },
  },
},
```

- [ ] **Step 4: Import font CSS in `src/index.tsx`**

Add before the `./index.css` import, one line per weight:

```ts
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
```

- [ ] **Step 5: Verify build + visual check**

Run: `cd frontend && npm run build`
Expected: typecheck + `vite build` pass (Tailwind compiles the new utilities without error).

Then `npm run dev`, open the app, toggle Light/Dark in the user menu:
- surfaces/borders/text change between themes;
- headings render in Sora, tracking IDs / data in JetBrains Mono, body in Inter;
- an accent button (`bg-accent text-accent-fg`) is legible in BOTH themes (Review Focus #5).

- [ ] **Step 6: Commit**

```bash
git add frontend/tailwind.config.js frontend/src/index.css frontend/src/index.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(design): add Rýni nord design tokens and typography"
```

---

### Task 2: Chart rewrite — line + area and categorical ramp

**Files:**
- Modify: `frontend/src/components/charts/TimeSeries.tsx`, `frontend/src/components/charts/TimeSeries.test.tsx`, `frontend/src/components/charts/Breakdown.tsx`, `frontend/src/components/charts/Breakdown.test.tsx`

**Interfaces:**
- Consumes: `series-1..8`, `accent`, `accent-3`, `border` token utilities from Task 1; types `SeriesPoint` (`{ date: string; views: number; uniqueVisitors: number }`) and `Breakdown` (`{ value: string; count: number }`) from `~/types`.
- Produces: `TimeSeries` keeps its public signature `(props: { points: SeriesPoint[]; compact?: boolean })`; `Breakdown` keeps `(props: { title: string; items: Breakdown[] })`. No caller changes.

- [ ] **Step 1: Rewrite `TimeSeries.test.tsx` to describe line + area**

Keep the `points` fixture and `renderChart()`/`afterEach` helpers. Replace the four `it` blocks:

```tsx
it('renders an area path and a line path', () => {
  const host = renderChart();
  expect(host.querySelector('path.ryni-area')).not.toBeNull();
  expect(host.querySelector('path.ryni-line')).not.toBeNull();
});

it('renders one hover hit target per point', () => {
  const host = renderChart();
  const hits = [...host.querySelectorAll('rect')].filter((r) => r.getAttribute('aria-label'));
  expect(hits).toHaveLength(points.length);
});

it('draws x-axis date labels', () => {
  const host = renderChart();
  const texts = [...host.querySelectorAll('text')].map((t) => t.textContent);
  expect(texts).toContain('Nov 1');
  expect(texts).toContain('Nov 4');
});

it('draws y-axis tick labels from 0 up to the axis max', () => {
  const host = renderChart();
  const texts = [...host.querySelectorAll('text')].map((t) => t.textContent);
  expect(texts).toContain('0');
  expect(texts).toContain('15'); // axisMax for max=12 is 15
});

it('shows a tooltip on hover with views and unique visitors', () => {
  const host = renderChart();
  const hit = [...host.querySelectorAll('rect')].find((r) => r.getAttribute('aria-label'));
  hit?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
  const texts = [...host.querySelectorAll('text')].map((t) => t.textContent);
  expect(texts.some((t) => t?.includes('views ·'))).toBe(true);
  expect(texts.some((t) => t?.includes('visitors'))).toBe(true);
});
```

Add two Review Focus tests:

```tsx
it('renders empty and single-point series without error', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <TimeSeries points={[]} />, host);
  render(() => <TimeSeries points={[points[0]]} />, host);
  expect(host.querySelector('svg')).not.toBeNull();
});

it('uses distinct gradient ids when two charts render together', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <TimeSeries points={points} />, host);
  render(() => <TimeSeries points={points} />, host);
  const ids = [...host.querySelectorAll('linearGradient')].map((g) => g.id);
  expect(new Set(ids).size).toBe(ids.length);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- TimeSeries`
Expected: FAIL — current bars render `rect`s, no `path.ryni-area`/`path.ryni-line`.

- [ ] **Step 3: Implement line + area in `TimeSeries.tsx`**

Keep `formatDate`, `niceStep`, `yTicks`, `xLabelIndices` unchanged. Replace the bar rendering:

- Add `createUniqueId` to the solid-js import; call `const uid = createUniqueId()` at the top of `FullSeries` and `MiniSeries` so gradient ids are unique per instance (Review Focus #1). Use ids `aurora-line-${uid}` and `aurora-fill-${uid}`.
- **Point x-coordinate:** for a point `i` of `n`, `x(i) = L + (i + 0.5) * (plotW() / n)` (centers). Guard `n <= 1`: if `n === 0` render an empty `<svg>`; if `n === 1` render the single point as a dot at `x(0)`, `y(views0)` (no path), with the same hit target.
- **Line path:** build `M x(0) y(views0) L x(1) y(views1) …` across points, as a `<path class="ryni-line" fill="none" stroke={url(lineId)} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`.
- **Area path:** the line path string + ` L x(n-1) baseline L x(0) baseline Z`, as `<path class="ryni-area" fill={url(fillId)} />`.
- **Gradients** in a single `<defs>`: `line` gradient `x1=0 y1=0 x2=1 y2=0` with stops `accent` → `accent-3`; `fill` gradient `x1=0 y1=0 x2=0 y2=1` with stops `accent` at `stop-opacity="0.35"` → `accent` at `stop-opacity="0"`. Put colors via inline style so CSS vars resolve at runtime: `<stop offset="0%" style="stop-color: var(--accent)" stop-opacity="0.35" />`.
- **Hit targets:** replace the bar `<rect>`s with invisible per-point `<rect x={x(i)-step/2} y={T} width={step} height={plotH} fill="transparent" aria-label={`${p.date}: ${p.views} views, ${p.uniqueVisitors} visitors`} onMouseEnter={() => setHover(i())} />` (keeps the hover test + accessibility). Draw a highlight `<circle>` at the hovered point and a vertical guide line when `hovered()` is set.
- **Recolor:** gridlines `stroke-border`, tick/date labels `fill-muted`, baseline `stroke-border-strong`, tooltip box `fill-surface` + `stroke-border` + `text-text` / `text-muted`.
- **`MiniSeries`:** same line + area treatment, no axes/tooltip, `preserveAspectRatio="none"`, viewBox `0 0 W 64`, classes `ryni-area`/`ryni-line`, unique gradient ids.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- TimeSeries`
Expected: PASS (all 7 tests).

- [ ] **Step 5: Add the ramp-cycle test to `Breakdown.test.tsx`**

Append to the existing `describe`:

```tsx
it('cycles the categorical ramp across bars (wraps past 8)', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <Breakdown title="Pages" items={Array.from({ length: 9 }, (_, i) => ({ value: `p${i}`, count: 9 - i }))} />, host);
  const fills = [...host.querySelectorAll('div[style*="--series-"]')];
  expect(fills.length).toBe(9);
  expect(fills[0].getAttribute('style')).not.toBe(fills[1].getAttribute('style'));
  expect(fills[8].getAttribute('style')).toContain('--series-1'); // wraps
});
```

- [ ] **Step 6: Run to verify the new test fails**

Run: `cd frontend && npm test -- Breakdown`
Expected: FAIL — bars are still `bg-slate-400`, no `--series-` background.

- [ ] **Step 7: Implement the ramp in `Breakdown.tsx`**

In the bar `<For each={visible()}>`, change to `{(item, i) => …}` and set the fill:
`<div class="h-1.5 rounded" style={{ background: `var(--series-${(i() % 8) + 1})` }} />`. Recolor the card chrome: `bg-surface`, `border-border`, `radius-card`, `text-muted` for the count + "No data".

- [ ] **Step 8: Run all chart tests**

Run: `cd frontend && npm test -- TimeSeries Breakdown`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/charts/
git commit -m "feat(charts): aurora line+area time-series and categorical breakdown ramp"
```

---

### Task 3: Layout, shared UI, and auth pages sweep

**Files:**
- Modify: `frontend/src/App.tsx`, `frontend/src/components/layout/Shell.tsx`, `frontend/src/components/layout/UserMenu.tsx`, `frontend/src/components/ui/CopyButton.tsx`, `frontend/src/components/dashboard/StatCard.tsx`, `frontend/src/components/dashboard/DateRange.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/Setup.tsx`

**Interfaces:**
- Consumes: token utilities from Task 1. No signatures change.

- [ ] **Step 1: Sweep tokens through the eight files**

Swap every `slate-*` / hardcoded color for the semantic token, per the spec's conventions table. Concrete mapping:

| Today | After |
|-------|-------|
| `bg-slate-50 dark:bg-slate-950` (page bg) | `bg-bg` |
| `bg-white dark:bg-slate-900` (card/surface) | `bg-surface` |
| `border-slate-200 dark:border-slate-800` | `border-border` |
| `text-slate-900 dark:text-white` / `dark:text-slate-100` | `text-text` |
| `text-slate-500 dark:text-slate-400` / `text-slate-600 dark:text-slate-300` | `text-muted` |
| `bg-slate-100 dark:bg-slate-800` (code/hover) | `bg-surface-2` |
| `rounded-lg` (cards) | `radius-card` |
| `bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900` (primary button) | `bg-accent text-accent-fg` |
| `text-red-500` / `text-red-600` | `text-danger` |
| `text-green-500` / `text-green-600` | `text-accent` |

Plus the two signature touches:

- `Shell.tsx` — logo `RÝNI` gains an accent dot: `<a …>RÝNI<span class="text-accent">.</span></a>`. Header border → `border-border`.
- `UserMenu.tsx` — avatar disc `bg-blue-600` → `bg-gradient-to-br from-accent-3 to-accent-2 text-white` (violet→glacier). Theme option buttons use `bg-surface-2` (selected) and `text-muted` / hover `bg-surface-2`.

Primary buttons in scope here: `Login.tsx` "Sign in", `Setup.tsx` "Create admin".

- [ ] **Step 2: Verify**

Run: `cd frontend && npm run build && npm test`
Expected: build (typecheck) + full suite pass (existing stats/auth/admin tests unaffected).

Visual (`npm run dev`): login page + shell in both themes — surfaces/borders/text correct, primary button green with legible text, avatar gradient, logo accent dot.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout frontend/src/components/ui frontend/src/components/dashboard frontend/src/pages/Login.tsx frontend/src/pages/Setup.tsx
git commit -m "style(design): apply nord tokens to layout, shared UI, and auth pages"
```

---

### Task 4: Feature pages, dialogs, and admin sweep

**Files:**
- Modify: `frontend/src/pages/Sites.tsx`, `frontend/src/pages/SiteNew.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Settings.tsx`, `frontend/src/pages/About.tsx`, `frontend/src/pages/admin/Users.tsx`, `frontend/src/components/sites/SiteCard.tsx`, `frontend/src/components/sites/Snippet.tsx`, `frontend/src/components/sites/ShareDialog.tsx`, `frontend/src/components/sites/SiteSettingsDialog.tsx`, `frontend/src/components/settings/OidcForm.tsx`, `frontend/src/components/settings/BackupPanel.tsx`

**Interfaces:**
- Consumes: token utilities from Task 1. No signatures change.

- [ ] **Step 1: Sweep tokens through the twelve files**

Same mapping table as Task 3 Step 1, plus these specific elements:

- Primary buttons (`bg-slate-900 …`) → `bg-accent text-accent-fg` in: `Sites.tsx` "Add site", `SiteNew.tsx` "Create site", `Dashboard.tsx` "Share"/"Edit" (these are outline — see below), `Snippet.tsx` "Done", `ShareDialog.tsx` "Search", `SiteSettingsDialog.tsx` "Save", `BackupPanel.tsx` "Create backup", `OidcForm.tsx` "Save".
- Outline/secondary buttons (Share, Edit, Cancel, date pills) → `border-border text-text bg-surface` (selected pill → `bg-accent text-accent-fg border-accent`).
- `Settings.tsx` active tab underline → `border-accent text-text`; inactive → `text-muted`.
- Member chips in `Dashboard.tsx`: manager `bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300` → `bg-surface-2 text-accent-3` (manager) and `bg-surface-2 text-muted` (viewer).
- `About.tsx` — `card` constant string `'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5'` → `'bg-surface border border-border radius-card p-5'`. `font-mono` usages are already JetBrains Mono via Task 1.
- `Users.tsx` table → `bg-surface border-border`, rows `border-border`.
- All code/pre blocks → `bg-surface-2`, `text-muted`.

- [ ] **Step 2: Verify**

Run: `cd frontend && npm run build && npm test`
Expected: build + full suite pass.

Visual (`npm run dev`): Sites grid, site detail dashboard (stat cards, line+area chart, 17 breakdown panels), dialogs, settings tabs, admin table — all correct in both themes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages frontend/src/components/sites frontend/src/components/settings
git commit -m "style(design): apply nord tokens to feature pages, dialogs, and admin"
```

---

## Self-Review Notes

- **Spec coverage:** tokens (Task 1), typography (Task 1), radius (Task 1), aurora line+area (Task 2), categorical ramp (Task 2), primary button / avatar / logo dot signatures (Task 3–4), full component sweep (Task 3–4). The "live indicator" signature has no existing UI element to attach to (the app shows "Current" as a StatCard, not a live dot), so it's intentionally not forced.
- **Font delivery:** `@fontsource` replaces the spec's `public/fonts/` wording — same self-hosted/privacy guarantee, idiomatic for Vite, no manual vendoring.
