# Site Settings Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shorten the site settings dialog by moving Tracking code, Campaign links, and Privacy disclosure into their own dialogs, opened from a secondary action row under the dashboard title.

**Architecture:** A minimal shared `Modal` shell backs three thin dialog wrappers over the existing `Snippet`, `CampaignLinks`, and `disclosureText`/`bannerSnippet` content. `Dashboard.tsx` gains an action row and mounts the dialogs; `SiteSettingsDialog.tsx` drops the three sections and keeps config + id/endpoint + delete/save.

**Tech Stack:** SolidJS + TypeScript (Vite/Vitest). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-22-settings-dialog-split-design.md`

## Global Constraints

- No new runtime dependencies.
- Content components (`Snippet`, `CampaignLinks`, `disclosure.ts`) and stores are unchanged.
- Settings keeps: name, allowed origins, privacy tier, disclosure mode, tracking id + endpoint, delete/save.
- The three new dialogs are read-only (no save logic).
- Reuse existing design tokens/classes (`bg-surface`, `rounded-radius-card`, `border-border`, `text-muted`, `text-accent-3`, etc.).
- `npm run typecheck` and `npm run build` must pass.

## Review Focus

1. **Modal backdrop vs content click** — clicking the overlay closes; clicking inside does not. Test in Task 1.
2. **Pre-load safety** — the dashboard action row renders before `site()` resolves; dialog mounts must be gated on `site()` so a click can't pass `null`. (Task 3, guarded by `<Show when={site()}>`.)
3. **Settings still saves correctly after removals** — the four config fields + save wiring must survive; no leftover references to removed sections. Verified by typecheck/build (Task 4).
4. **Disclosure copy uses the saved tier** — the dialog derives from `trackingModeOf(site.tracking_mode)`, not any unsaved local state. (Task 2.)
5. **No unused imports left behind** — removing sections must also drop `Snippet`/`CampaignLinks`/`disclosureText`/`bannerSnippet` imports (Task 4; typecheck fails otherwise).

---

### Task 1: Shared `Modal` primitive

**Files:**
- Create: `frontend/src/components/ui/Modal.tsx`
- Test: `frontend/src/components/ui/Modal.test.tsx`

**Interfaces:**
- Produces: `Modal(props: { title: string; onClose: () => void; children: JSX.Element; maxWidth?: string })`. Renders a fixed overlay (`fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto p-4`); clicking the overlay calls `onClose`; the inner card (`bg-surface rounded-radius-card shadow p-6 w-full ${maxWidth ?? 'max-w-2xl'} space-y-4 my-8`) stops propagation; a header shows `<h2>{title}</h2>` and a close button (`aria-label="Close"`, text `✕`) calling `onClose`; then `{children}`.

- [ ] **Step 1: Write the failing test** — in `Modal.test.tsx` (mirror `TimeSeries.test.tsx`'s `render(() => …, host)` pattern):
  - renders the title and the child text.
  - clicking the overlay element calls `onClose` (count == 1).
  - clicking the inner card does **not** call `onClose` (count stays 0) — verifies stopPropagation.
  - clicking the close button calls `onClose`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Modal.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `Modal.tsx`** per the interface above.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Modal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Modal.tsx frontend/src/components/ui/Modal.test.tsx
git commit -m "feat(ui): add shared Modal shell"
```

### Task 2: Three site dialogs

**Files:**
- Create: `frontend/src/components/sites/TrackingCodeDialog.tsx`
- Create: `frontend/src/components/sites/CampaignLinksDialog.tsx`
- Create: `frontend/src/components/sites/DisclosureDialog.tsx`

**Interfaces:**
- Consumes: `Modal` (Task 1); `Snippet`, `CampaignLinks`, `disclosureText`, `bannerSnippet`, `trackingModeOf`, `CopyButton`, `Site`.
- Produces: `TrackingCodeDialog(props: { site: Site; onClose: () => void })`, `CampaignLinksDialog(props: { site: Site; onClose: () => void })`, `DisclosureDialog(props: { site: Site; onClose: () => void })`.

- [ ] **Step 1: Implement `TrackingCodeDialog.tsx`** — `<Modal title="Tracking code" onClose={props.onClose}><Snippet input={{ server: window.location.origin, site: props.site.tracking_id, detailed: false, mode: trackingModeOf(props.site.tracking_mode) }} /></Modal>`.

- [ ] **Step 2: Implement `CampaignLinksDialog.tsx`** — `<Modal title="Campaign links" onClose={props.onClose}><CampaignLinks baseUrl={props.site.allowed_origins?.[0] ?? ''} /></Modal>`.

- [ ] **Step 3: Implement `DisclosureDialog.tsx`** — `<Modal title="Privacy disclosure" onClose={props.onClose}>` containing: a short `text-sm text-muted` hint ("Enable Text or Banner in Site settings to publish this."), then the same two blocks the settings dialog used: a "Disclosure text" `<pre>` + `CopyButton` for `disclosureText({ mode: trackingModeOf(props.site.tracking_mode) })`, and a "Dismissal banner" `<pre>` + `CopyButton` for `bannerSnippet({ mode: trackingModeOf(props.site.tracking_mode) })`. Reuse the pre styling from the old settings block (`whitespace-pre-wrap break-words text-sm font-mono border border-border rounded-radius-sm p-3 bg-surface dark:bg-surface-2 max-h-48 overflow-y-auto`; banner uses `break-all`).

- [ ] **Step 4: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: PASS (no new unit tests — thin wrappers, consistent with the repo having no `SiteSettingsDialog` test).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/sites/TrackingCodeDialog.tsx frontend/src/components/sites/CampaignLinksDialog.tsx frontend/src/components/sites/DisclosureDialog.tsx
git commit -m "feat(sites): tracking code, campaign links and disclosure dialogs"
```

### Task 3: Dashboard action row + dialog mounts

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `TrackingCodeDialog`, `CampaignLinksDialog`, `DisclosureDialog` (Task 2).
- Produces: three signals `codeOpen`, `campaignOpen`, `disclosureOpen`; an action row; three `<Show>` dialog mounts.

- [ ] **Step 1: Implement** — add `const [codeOpen, setCodeOpen] = createSignal(false);` etc. Insert a row between the tracking-id `<div>` and the `<Show when={members()}>` block inside the title block:
  ```tsx
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm">
    <button onClick={() => setCodeOpen(true)} class="text-accent-3 hover:underline">Tracking code</button>
    <button onClick={() => setCampaignOpen(true)} class="text-accent-3 hover:underline">Campaign links</button>
    <button onClick={() => setDisclosureOpen(true)} class="text-accent-3 hover:underline">Privacy disclosure</button>
  </div>
  ```
  Add three mounts after the existing `ShareDialog`/`SiteSettingsDialog` `<Show>` blocks, each gated on `site()`:
  ```tsx
  <Show when={codeOpen() && site()}>
    <TrackingCodeDialog site={site()!} onClose={() => setCodeOpen(false)} />
  </Show>
  ```
  (and the same for campaign/disclosure).

- [ ] **Step 2: Typecheck + build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): secondary actions for code, campaigns and disclosure"
```

### Task 4: Slim down `SiteSettingsDialog`

**Files:**
- Modify: `frontend/src/components/sites/SiteSettingsDialog.tsx`

**Interfaces:**
- No interface change; removes the three sections.

- [ ] **Step 1: Implement** — remove:
  - the "Tracking code" block (`<div class="border-t border-border pt-4"><h3>Tracking code</h3><Snippet …/></div>`).
  - the disclosure `<Show when={disclosureMode() !== 'none'}>` block.
  - the Campaigns block (`<div class="border-t border-border pt-4"><CampaignLinks …/></div>`).
  - the now-unused imports `Snippet`, `CampaignLinks`, `disclosureText`, `bannerSnippet`, and the now-unused `server` const. **Keep** `CopyButton` (still used for tracking id) and `trackingModeOf`/`disclosureModeOf` (still used by the selects).
  - Update the top comment to drop "review the integration snippets again".

- [ ] **Step 2: Typecheck + build + full frontend tests**

Run: `cd frontend && npm run typecheck && npm run build && npm test`
Expected: PASS (99+ tests; no failures).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/sites/SiteSettingsDialog.tsx
git commit -m "refactor(sites): slim settings dialog to config only"
```

---

## Self-review notes

- Spec coverage: settings shrink (T4), three dialogs (T2), action row (T3), shared overlay (T1) — all covered.
- Review Focus 1 → Modal test (T1). 2 → `<Show when={site()}>` gating (T3). 3/5 → typecheck/build (T4). 4 → `trackingModeOf(site.tracking_mode)` (T2).
- Type consistency: all three dialogs share `{ site: Site; onClose: () => void }`.
