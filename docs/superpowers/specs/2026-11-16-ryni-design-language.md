# Rýni Design Language

> Status: draft — awaiting approval
> Date: 2026-11-16

## Intent

Rýni currently reads as "Ackee with a different name": default Tailwind slate
palette, no accent color, no custom type, no tokens. We want an independent
visual identity — vivid but its own, tied to Iceland (the app's Icelandic name,
"rýni" = scrutiny/inspection) — with two themes: a dark **Polar Night** and a
light **Glacier**.

The identity's signature is the **aurora**: a cool blue-black/ice base under a
green→violet gradient, with glacier-blue, geothermal-orange and aurora-pink as
secondary accents. Vivid accents on a calm nordic base.

## Goals / Non-goals / Anti-goals

**Goals**
- Own, memorable identity — nothing in the palette or type copied from Ackee.
- Two themes (dark default, light available), same semantics, toggle via the
  existing `darkMode: 'class'`.
- Tokenized in Tailwind: components consume semantic tokens, never raw hex.
- Data-forward: analytics numbers set in a mono face for alignment and feel.

**Non-goals**
- No new layout or navigation restructure. The existing top-bar shell, page
  structure, and routes stay. This is a visual language, not an IA change.
- No dark-only design. Both themes get equal treatment.

**Anti-goals**
- Not a stock Nord palette drop-in. Nord's Aurora colors are muted; ours are
  deliberately more saturated so the app reads vivid, not flat.
- No gradients everywhere. Aurora gradient appears in deliberate spots only
  (chart line, logo accent, avatar, empty-state accent) — never as page chrome.

## Constraints

- Stack: SolidJS + Tailwind (v3 config at `frontend/tailwind.config.js`), with
  `darkMode: 'class'` already wired. Theme is applied via a `dark` class on
  `<html>`.
- Styling is currently utility classes scattered across ~30 components under
  `frontend/src/components/` and `frontend/src/pages/`. No component library —
  we style with Tailwind utilities directly.
- Fonts must be self-hostable (privacy product, no external requests from the
  dashboard). We will vendor the font files, not load from Google Fonts.

## Approaches considered

1. **Keep the slate default** (status quo) — rejected: it's why the app reads
   as an Ackee clone.
2. **Stock Nord palette** (nordtheme.com) — rejected: cool and disciplined but
   muted; contradicts the "vivid" requirement and would still read generic.
3. **Iceland-derived two-theme system** (chosen) — cool polar base + aurora
   accents, bright and dark variants, custom type. Distinct, vivid, on-brand.

The user approved the visual direction from the side-by-side mockup (dark
"Polar Night" + light "Glacier").

## Design tokens

Semantic tokens are defined as CSS custom properties on `:root` (light) and
`.dark` (dark), surfaced into Tailwind via `colors` in `tailwind.config.js`.
Components reference semantic names only (`bg`, `surface`, `border`, `text`,
`muted`, `accent`, …), never raw hex.

### Base + surface

| Token | Dark (Polar Night) | Light (Glacier) |
|-------|--------------------|-----------------|
| `bg` | `#0D1120` | `#F3F5FB` |
| `surface` | `#151A2D` | `#FFFFFF` |
| `surface-2` | `#1C2339` | `#EEF1F8` |
| `border` | `#262D45` | `#E1E6F0` |
| `border-strong` | `#333B58` | `#CBD3E2` |

### Text

| Token | Dark | Light |
|-------|------|-------|
| `text` | `#E8ECF6` | `#171C2E` |
| `muted` | `#98A0BA` | `#64708C` |
| `faint` | `#6B7390` | `#96A0B8` |

### Accents (semantic roles)

| Token | Role | Dark | Light |
|-------|------|------|-------|
| `accent` | primary action / live / positive | `#4EE6A8` | `#0BA477` |
| `accent-2` | info / secondary | `#6FD3F7` | `#0284C7` |
| `accent-3` | tertiary / violet | `#A58BFF` | `#7C3AED` |
| `warn` | warning / geothermal | `#FF9E64` | `#E5641B` |
| `danger` | destructive / aurora-pink | `#FF7AB6` | `#DB2777` |

### Categorical chart series

Ordered ramp for breakdown bars / series, so repeated datasets stay consistent
across charts. Dark and light are the same hues, re-tuned per theme for
contrast against their base.

| # | Hue | Dark | Light |
|---|-----|------|-------|
| 1 | aurora | `#4EE6A8` | `#0BA477` |
| 2 | glacier | `#6FD3F7` | `#0284C7` |
| 3 | violet | `#A58BFF` | `#7C3AED` |
| 4 | geothermal | `#FF9E64` | `#E5641B` |
| 5 | aurora-pink | `#FF7AB6` | `#DB2777` |
| 6 | moss | `#B8E06A` | `#65A30D` |
| 7 | steel | `#8FA3C8` | `#475569` |
| 8 | amber | `#FFD166` | `#B45309` |

## Typography

| Role | Face | Weights |
|------|------|---------|
| Display / headings / logo | **Sora** | 600, 700 |
| Body / UI | **Inter** | 400, 500, 600 |
| Data (numbers, durations, tracking IDs, code) | **JetBrains Mono** | 500, 600, 700 |

- Data values use `font-variant-numeric: tabular-nums` so stat cards and tables
  align cleanly.
- Heading sizes stay near current scale (page title ~`text-2xl`), no redesign
  of hierarchy — only the face changes.
- Fonts vendored under `frontend/public/fonts/` and referenced by local
  `@font-face` (no external requests — privacy).

## Shape, spacing, elevation

- **Radius:** semantic names, added alongside Tailwind defaults (defaults left
  untouched to avoid silent `rounded-lg` jumps): `radius-sm` 8px (buttons,
  inputs) · `radius-card` 12px (cards, panels) · `radius-shell` 18px (outer
  shell, modals) · `radius-pill` 999px (pills, live dot, avatar).
- **Spacing:** Tailwind default scale, unchanged.
- **Elevation:** flat-first — hairline borders do the work; shadows are subtle
  and used sparingly (hover lift, modals). No heavy drop shadows.

## The aurora signature

Deliberate, not pervasive:

1. **Chart line + area** — the time-series is rewritten from bars to a line +
   area: the line and its under-fill use a horizontal green→violet gradient
   (`accent` → `accent-3`). The mini sparkline follows the same line+area
   treatment. This is the single most recognizable element.
2. **Logo accent** — the dot after "RÝNI" (and any wordmark accent) is
   `accent` (aurora green).
3. **Live indicator** — the "live visitors" dot is `accent`, subtle pulse.
4. **Avatar** — a `accent-3 → accent-2` (violet→glacier) gradient disc.
5. **Primary button** — solid `accent` (aurora green) in both themes, text
   color inverted for contrast. `#0BA477` reads fine on light, so no theme
   split.

Accents otherwise appear as: positive/negative deltas (`accent` / `warn`),
links and focus states (`accent-2`), destructive actions (`danger`).

## Component conventions (what changes, where)

| Surface | Today | After |
|---------|-------|-------|
| Page body | `bg-slate-50 dark:bg-slate-950` | `bg` (token) |
| Header | `border-slate-200 dark:border-slate-800` | `border` |
| Stat cards | `bg-white dark:bg-slate-900 rounded-lg border-slate-200` | `surface`, `md` radius |
| Primary button | `bg-slate-900 text-white dark:bg-slate-100` | `accent` (solid) |
| Links / nav | `text-slate-600 dark:text-slate-300` | `muted`, hover `text` |
| Data values | default font | JetBrains Mono + tabular-nums |

The full re-theme is a mechanical sweep across `frontend/src/**`: replace
`slate-*` utilities with the semantic tokens. Charts (`TimeSeries.tsx`,
`Breakdown.tsx`) adopt the categorical ramp + aurora gradient.

## What's left to the builder

- Exact CSS custom-property wiring in `frontend/src/index.css` and the
  `colors` map in `tailwind.config.js` (mapping the tables above 1:1).
- Which components take which token (the sweep), per the conventions table.
- Vendoring the three font families into `public/fonts/`.
- Chart color plumbing: `Breakdown` bars cycle the categorical ramp per item;
  `TimeSeries` (single metric) gets the aurora gradient alone — no ramp.
- A light/dark toggle hook if one doesn't already exist (verify current theme
  state handling first — `darkMode: 'class'` is set; confirm who toggles it).

## Not in scope

- Layout, navigation, or IA changes.
- New components beyond what the re-theme requires.
- Landing page (`site/`) — this language covers the dashboard app only for now.
