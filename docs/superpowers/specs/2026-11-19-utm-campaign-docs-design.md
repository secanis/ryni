# Rýni — UTM campaign docs in the site edit dialog + button icons

Date: 2026-11-19
Status: draft (awaiting approval)
Size: small change

## Intent & why

Users can already tag inbound links with `utm_source` / `utm_medium` /
`utm_campaign` and Rýni shows the three breakdowns on the dashboard, but
nothing in the UI tells them how. The site **edit** dialog is where a site is
managed, so that is where the campaign documentation belongs — next to the
tracking snippets. A small link builder makes the documented convention
immediately usable. Separately, the dashboard "Share" and "Edit" buttons are
text-only and should get icons to match the rest of the UI (e.g. "Delete
site" uses `Trash2`).

## Goals

- Explain the three supported UTM parameters, naming conventions, and where
  the values appear in Rýni.
- Provide an interactive campaign-link builder in the edit dialog: base URL +
  source/medium/campaign → tagged URL, with copy to clipboard.
- Add icons (text kept) to the dashboard "Share" and "Edit" buttons.

## Non-goals

- No new tracking parameters (`utm_term` / `utm_content` stay unsupported).
- No campaign CRUD, saved campaigns, or campaign analytics views.
- No change to the share (user-grant) dialog.
- No separate docs page or nav entry.

## Approaches considered

1. **Section inside `SiteSettingsDialog` with an extracted `CampaignLinks`
   component + pure `buildCampaignUrl` helper (chosen).** Matches the existing
   pattern where the dialog already embeds `Snippet`; keeps the dialog file
   readable; the pure helper is unit-testable.
2. Inline everything in `SiteSettingsDialog.tsx` — no new files, but the
   dialog grows large and URL logic becomes untestable in isolation.
3. Static markdown only — no in-app help, contradicts the request for usable
   campaign integration.

## Design

- `frontend/src/utils/campaignUrl.ts`
  - `buildCampaignUrl({ base, source, medium, campaign })`.
  - Preserves existing query string and fragment; empty values are omitted;
    values are `encodeURIComponent`-ed; returns `''` when `base` is empty.
  - Accepts absolute URLs and root-relative paths (`/landing`); leaves the
    base untouched when no params are set.
- `frontend/src/components/sites/CampaignLinks.tsx`
  - Short explainer: what each param means; lowercase + hyphen naming; use the
    same values consistently; params must be on the first URL a visitor lands
    on; values show up under "UTM source / UTM medium / UTM campaign" on the
    dashboard; only these three are read.
  - Builder: base URL (prefilled with the first allowed origin when present),
    source, medium, campaign inputs; live result in a `<code>` block with the
    existing `CopyButton`.
  - Styling follows existing tokens (`bg-surface-2`, `border-border`,
    `rounded-radius-sm`, `text-muted`).
- `SiteSettingsDialog.tsx`: new "Campaigns (UTM)" block below "Tracking code".
- `Dashboard.tsx`: `Share2` and `Pencil` icons from `lucide-solid`, sized 15,
  `inline-flex items-center gap-1.5`, text labels unchanged.
- Tests: unit tests for `buildCampaignUrl` (params appended/encoded, existing
  query preserved, empty values dropped, empty base); component test asserting
  the builder output and docs text render.

## Constraints

- SolidJS + Tailwind tokens + `lucide-solid`, as the rest of the frontend.
- `npm test`, `npm run typecheck`, `npm run lint` must pass.

## Left to the builder

- Exact wording of the explainer and the example values.
- Whether the docs block is collapsible (default: always visible, it is short).
