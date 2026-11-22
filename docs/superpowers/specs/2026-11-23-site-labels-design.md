# Site labels — small design

Date: 2026-11-23
Status: draft, awaiting approval

## Intent & why

Sites are only distinguishable by name; there is no way to mark which ones are
production, staging, a customer, or a project. Free-form labels (tags) make the
site list and the per-site dashboard scannable without adding a taxonomy the
user has to maintain.

Requested by Matthias: "add a feature to label sites, show these labels in the
same row as the user pills and also in the site card on the overview."

## Goals

- Any number of free-form labels per site, editable in the site settings
  dialog as a comma-separated input (same pattern as allowed origins).
- Labels render as neutral pills in the dashboard header, in the same
  `flex flex-wrap` row as the manager/viewer pills.
- Labels render on the site card in the Sites overview.
- Empty labels = today's behavior; no visual noise for unlabeled sites.

## Non-goals / anti-goals

- No label colors, no global label catalog, no autocomplete/suggestions.
- No filtering or sorting of the Sites list by label (show only, for now).
- No changes to the tracker, ingest hook, stats route, or snippets.
- No label field on the "Add site" form (labels are set after creation).
- No new runtime dependencies, no new collection.

## Approaches considered

- **A (chosen)** — a single optional `labels` JSON string array on the existing
  `sites` record, edited in the settings dialog, rendered by one shared
  `SiteLabels` component in both places. Mirrors `allowed_origins`, no new
  collection or relation, and label values need no joins.
- **B** — a separate `site_labels` collection with a multi-relation, giving a
  reusable catalog with colors and IDs. Correct if labels ever need colors,
  renaming across sites, or filtering at the DB level; overkill for free-form
  strings and adds rules/relations for no present benefit.
- **C** — a single `SelectField` category. Cheapest render, but one label per
  site and a migration each time the category list changes; contradicts the
  "free-form tags" choice.

## Decisions (with Matthias)

- Free-form labels, any number per site (option 1 of the proposal).
- Show only for now — no filtering of the site list.

## Design detail

- **Migration** `pocketbase/pb_migrations/1740000006_add_site_labels.js`:
  add an optional `JSONField` named `labels` (maxSize 10000, same as
  `allowed_origins`), idempotent (only added when missing). No backfill: an
  absent value means "no labels". Rollback is best-effort and leaves the field.
- **Type**: `Site` gains `labels?: string[]`.
- **Store** (`frontend/src/stores/sites.ts`): `update()` accepts an optional
  `labels: string[]` and includes it in the payload only when defined (same
  handling as `tracking_mode` / `disclosure_mode`).
- **Normalization** (`frontend/src/utils/labels.ts`): `parseLabels(input:
  string)` splits on commas, trims, drops empties, dedupes case-insensitively,
  keeps first-seen order, and caps at 20 labels × 32 chars. Also
  `siteLabels(site)` returning a clean array for rendering (missing/[] → []).
- **Rendering** (`frontend/src/components/sites/SiteLabels.tsx`): takes
  `labels: string[]`, renders nothing when empty, otherwise a `flex flex-wrap
  gap-1.5` row of outline pills (`border border-border text-muted text-xs px-2
  py-0.5 rounded-full`) — visually distinct from the filled role pills.
- **Dashboard** (`frontend/src/pages/Dashboard.tsx`): render `<SiteLabels>` as
  the first child of the existing members pill row, so labels and user pills
  share one wrapped line. The row must render when either labels or members
  exist.
- **Site card** (`frontend/src/components/sites/SiteCard.tsx`): render
  `<SiteLabels>` under the name / tracking-id block.
- **Settings dialog** (`frontend/src/components/sites/SiteSettingsDialog.tsx`):
  new "Labels (comma-separated)" input below the origins field, initialized
  from `site.labels`, saved through `parseLabels`.

## What's left to the builder

- Exact pill spacing/order (labels before member pills, as proposed).
- Whether the settings input keeps the raw text on save or re-renders the
  normalized list after save (dialog closes on save, so either is invisible).
- Whether to show label count as a hint; default is no.

## Tests

- `frontend/src/utils/labels.test.ts`: parsing/normalization edge cases
  (commas, blanks, duplicates, caps).
- `frontend/src/components/sites/SiteLabels.test.tsx`: renders nothing when
  empty, renders each label pill when present.
- Existing suites (`SiteDialogs.test.tsx`, `SiteCard` usage) stay green; the
  `Site` fixture in tests needs no change because `labels` is optional.
