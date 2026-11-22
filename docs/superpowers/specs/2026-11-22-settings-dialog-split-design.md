# Site settings split — small design

Date: 2026-11-22
Status: draft, awaiting approval

## Intent & why

The site settings dialog has grown into four stacked sections (config, tracking
id/endpoint, tracking code, privacy disclosure, campaigns) and is long and
scroll-heavy. Move the read-only / informational sections out into their own
dialogs, opened from a quiet secondary action row in the dashboard header.
Settings becomes a short config form.

## Goals

- Settings dialog is short: config (name, origins, privacy tier, disclosure
  mode) + tracking id/endpoint + delete/save.
- **Tracking code**, **Campaign links**, and **Privacy disclosure** each get
  their own dialog.
- A secondary text-action row in the dashboard header opens them.

## Non-goals / anti-goals

- No behavior change to the content itself: `Snippet`, `CampaignLinks`,
  `disclosureText`/`bannerSnippet`, stores, and saving logic are untouched.
- No new runtime dependencies.
- Config fields (name / origins / tier / disclosure mode) stay in settings.
- Not a broader dashboard redesign.

## Approaches considered

- **A** — icon buttons inline in the header's right cluster: compact, but icon
  meaning is unclear (mystery meat).
- **B (chosen)** — a "More ⋯" dropdown beside Edit holding the three actions:
  header stays minimal, one new control.
- **C** — a quiet secondary text-action row under the site title: no crowding
  and discoverable, but after a local preview this read as too buried; switched
  to B.

## Decisions (with Matthias)

- Three dialogs: Tracking code, Campaign links, Privacy disclosure.
- Entry: a **"More ⋯" dropdown beside Share/Edit** (option B; switched from C
  after a local preview).

## Design detail

- New components in `frontend/src/components/sites/`:
  `TrackingCodeDialog.tsx`, `CampaignLinksDialog.tsx`, `DisclosureDialog.tsx`.
  Each is a thin modal wrapper around existing content, taking a `site: Site`
  prop:
  - Tracking code → `<Snippet input={{ server, site: site.tracking_id, detailed: false, mode: trackingModeOf(site.tracking_mode) }} />`
  - Campaign links → `<CampaignLinks baseUrl={site.allowed_origins?.[0] ?? ''} />`
  - Privacy disclosure → `disclosureText` + `bannerSnippet` for
    `trackingModeOf(site.tracking_mode)`, with copy buttons.
- Shared overlay: a minimal `frontend/src/components/ui/Modal.tsx`
  (overlay + title + close) used by the three new dialogs. **My call:** create
  it to avoid three copies; leave the existing dialogs untouched to keep scope
  small.
- `Dashboard.tsx`: add a `flex flex-wrap` row under the tracking-id line with
  three small text buttons ("Tracking code", "Campaign links", "Privacy
  disclosure"), each opening its dialog; pass the loaded `site`.
- `SiteSettingsDialog.tsx`: remove the Tracking code, Privacy disclosure, and
  Campaigns sections; keep config + id/endpoint + delete/save.
- Disclosure dialog always available (not gated on `disclosure_mode`); it shows
  the copy for the site's saved tier and notes that enabling Text/Banner happens
  in site settings.

## What's left to the builder

- Exact `Modal` shell API (props: title, onClose, children) and styling.
- Exact action-row placement/styling (small text buttons, optional icons).
- Whether the disclosure dialog adds a short "enable in settings" hint.
- No new unit tests required (these are thin wrappers; repo has no
  SiteSettingsDialog test); keep existing `Snippet`/`CampaignLinks` tests green.
