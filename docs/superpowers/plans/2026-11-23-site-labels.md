# Site Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add free-form labels to sites and show them as pills in the dashboard header (same row as the manager/viewer pills) and on the site card.

**Architecture:** A new optional `labels` JSON string array on the existing `sites` collection, edited as a comma-separated field in the site settings dialog, normalized by a small utility, and rendered by one shared `SiteLabels` component used in both display locations.

**Tech Stack:** PocketBase v0.40 migrations (JS), SolidJS + TypeScript frontend, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-23-site-labels-design.md`

## Global Constraints

- No new runtime dependencies, no new collection, no new routes.
- `labels` is optional; absent/empty means "no labels" and renders nothing.
- Normalization caps: 20 labels per site, 32 characters per label.
- Field storage: `JSONField` named `labels`, `maxSize: 10000` (same as `allowed_origins`).
- Show only — no filtering/sorting by label, no colors, no autocomplete.
- Do not touch the tracker, ingest hook, stats route, or snippets.

## Review Focus

- A site record created before this change has no `labels` value → renderers must treat it as `[]` and show no pills.
- Input `"a, a,  a ,, b"` → `['a','b']`; case-insensitive dedupe keeps first spelling.
- Clearing every label in settings must persist `[]` (not leave the old labels in place).
- A label containing only whitespace or exceeding 32 chars must not produce a broken/oversized pill.
- Labels and role pills must share one wrapped row in the header, and the row must still render when the site has labels but no members.

---

### Task 1: Add the `labels` field (migration + PB test)

**Files:**
- Create: `pocketbase/pb_migrations/1740000006_add_site_labels.js`
- Test: `pocketbase/tests/collections.test.ts` (append a `describe('labels field')` block)

**Interfaces:**
- Consumes: nothing.
- Produces: `sites.labels` — optional JSON array of strings.

- [ ] **Step 1: Write the failing test**

Append inside the top-level `describe` in `pocketbase/tests/collections.test.ts`:

```ts
describe('labels field', () => {
  it('exposes an optional labels JSON field on sites', async () => {
    const admin = await createAdminClient();
    const sites = await admin.collections.getOne('sites');
    const labels = sites.fields.find((f: any) => f.name === 'labels');
    expect(labels).toBeTruthy();
    expect(labels.type).toBe('json');
    expect(labels.required).toBeFalsy();
  });

  it('stores and reads back a labels array', async () => {
    const user = await createUserClient('labels-store');
    const trackingId = rand();
    const site = await user.pb.collection('sites').create({
      name: 'Labeled Site',
      tracking_id: trackingId,
      endpoint_slug: trackingId,
      allowed_origins: [],
      created_by: user.userId,
      labels: ['production', 'customer-acme'],
    });
    const fetched = await user.pb.collection('sites').getOne(site.id);
    expect(fetched.labels).toEqual(['production', 'customer-acme']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd pocketbase && npx vitest run tests/collections.test.ts` (needs Docker; `setup.ts` builds/starts PocketBase)
Expected: FAIL — `labels` is undefined.

- [ ] **Step 3: Create the migration**

`pocketbase/pb_migrations/1740000006_add_site_labels.js`, modeled on `1740000005_add_privacy_settings.js`: `migrate((app) => { const sites = app.findCollectionByNameOrId('sites'); if (sites.fields.getByName('labels')) return; sites.fields.add(new JSONField({ name: 'labels', maxSize: 10000 })); app.save(sites); }, (app) => {})`. No backfill.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd pocketbase && npx vitest run tests/collections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pocketbase/pb_migrations/1740000006_add_site_labels.js pocketbase/tests/collections.test.ts
git commit -m "feat(sites): add optional labels field"
```

---

### Task 2: Label normalization utility

**Files:**
- Create: `frontend/src/utils/labels.ts`
- Test: `frontend/src/utils/labels.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `MAX_LABELS = 20`, `MAX_LABEL_LEN = 32`
  - `parseLabels(input: string): string[]` — split on `,`, trim, drop empty, truncate each to 32 chars, case-insensitive dedupe (keep first spelling), first 20.
  - `siteLabels(site: { labels?: unknown }): string[]` — returns `[]` unless `labels` is an array; keeps only non-empty strings (already-normalized values pass through).

- [ ] **Step 1: Write the failing test**

`frontend/src/utils/labels.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseLabels, siteLabels } from './labels';

describe('parseLabels', () => {
  it('splits, trims and drops blanks', () => {
    expect(parseLabels('a, b , ,c')).toEqual(['a', 'b', 'c']);
  });
  it('dedupes case-insensitively keeping the first spelling', () => {
    expect(parseLabels('Acme, acme, ACME')).toEqual(['Acme']);
  });
  it('caps at 20 labels', () => {
    expect(parseLabels(Array.from({ length: 25 }, (_, i) => `l${i}`).join(','))).toHaveLength(20);
  });
  it('caps each label at 32 chars', () => {
    expect(parseLabels('x'.repeat(40))[0]).toHaveLength(32);
  });
  it('returns [] for empty or whitespace input', () => {
    expect(parseLabels('')).toEqual([]);
    expect(parseLabels('  , ,')).toEqual([]);
  });
});

describe('siteLabels', () => {
  it('returns [] for a legacy site without labels', () => {
    expect(siteLabels({})).toEqual([]);
  });
  it('returns the stored labels', () => {
    expect(siteLabels({ labels: ['prod'] })).toEqual(['prod']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/labels.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `frontend/src/utils/labels.ts`**

Export the two constants and both functions per the Interfaces block. Use a `Set` keyed on `label.toLowerCase()` for dedupe.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/labels.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/labels.ts frontend/src/utils/labels.test.ts
git commit -m "feat(sites): add label parsing helper"
```

---

### Task 3: `SiteLabels` pill component

**Files:**
- Create: `frontend/src/components/sites/SiteLabels.tsx`
- Test: `frontend/src/components/sites/SiteLabels.test.tsx`

**Interfaces:**
- Consumes: `siteLabels` from Task 2 is **not** used here — the component takes an already-clean array.
- Produces: `export default function SiteLabels(props: { labels: string[] })` — renders nothing for an empty/all-blank array; otherwise a `div.flex.flex-wrap.gap-1.5` containing one `span` per label with classes `inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-border text-muted` and the label text.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import SiteLabels from './SiteLabels';

function mount(labels: string[]) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <SiteLabels labels={labels} />, host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SiteLabels', () => {
  it('renders nothing for an empty list', () => {
    expect(mount([]).textContent).toBe('');
  });
  it('renders one pill per label', () => {
    const host = mount(['production', 'acme']);
    expect([...host.querySelectorAll('span')].map((s) => s.textContent)).toEqual([
      'production',
      'acme',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/sites/SiteLabels.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
import { For, Show } from 'solid-js';

export default function SiteLabels(props: { labels: string[] }) {
  return (
    <Show when={props.labels.length > 0}>
      <div class="flex flex-wrap gap-1.5">
        <For each={props.labels}>{(label) => <span class="…">{label}</span>}</For>
      </div>
    </Show>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/sites/SiteLabels.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/sites/SiteLabels.tsx frontend/src/components/sites/SiteLabels.test.tsx
git commit -m "feat(sites): add SiteLabels pill component"
```

---

### Task 4: Type + store wiring

**Files:**
- Modify: `frontend/src/types/index.ts` (the `Site` interface)
- Modify: `frontend/src/stores/sites.ts` (`update`)

**Interfaces:**
- Consumes: `labels` field from Task 1.
- Produces:
  - `Site.labels?: string[]`
  - `sitesStore.update(id: string, data: { name: string; allowed_origins: string[]; tracking_mode?: TrackingMode; disclosure_mode?: DisclosureMode; labels?: string[] }): Promise<Site>` — includes `labels` in the update payload only when `data.labels !== undefined`.

- [ ] **Step 1: Add `labels?: string[]` to the `Site` interface and extend the `update` signature/payload** per the Interfaces block (same optional handling as `tracking_mode`).

- [ ] **Step 2: Verify typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/stores/sites.ts
git commit -m "feat(sites): add labels to the site type and update payload"
```

---

### Task 5: Labels input in the site settings dialog

**Files:**
- Modify: `frontend/src/components/sites/SiteSettingsDialog.tsx`
- Test: `frontend/src/components/sites/SiteDialogs.test.tsx`

**Interfaces:**
- Consumes: `parseLabels` (Task 2), `Site.labels` / `sitesStore.update(..., { labels })` (Task 4).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Add to `SiteDialogs.test.tsx` (mock `~/stores/sites` with `vi.hoisted`, as `UserDialog.test.tsx` does):

```tsx
// module-level: vi.mock('~/stores/sites', () => ({ sitesStore: { update: mockUpdate, remove: vi.fn() } }))
it('SiteSettingsDialog saves parsed labels', async () => {
  mockUpdate.mockResolvedValueOnce({ ...site, labels: ['prod'] });
  const host = mount(() => <SiteSettingsDialog site={{ ...site, labels: ['old'] }} onClose={() => {}} />);
  const input = [...host.querySelectorAll('input')].find((i) => i.id === 'site-labels')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, 'prod, prod ,, Acme');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Save'))!.click();
  await Promise.resolve();
  expect(mockUpdate).toHaveBeenCalledWith(site.id, expect.objectContaining({ labels: ['prod', 'Acme'] }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/sites/SiteDialogs.test.tsx`
Expected: FAIL — no `#site-labels` input.

- [ ] **Step 3: Add the field**

In `SiteSettingsDialog.tsx`: `const [labels, setLabels] = createSignal(untrack(() => (props.site.labels || []).join(', ')));` and an input with `id="site-labels"`, label `Labels (comma-separated)`, placeholder `production, customer-acme`, placed after the origins field. Pass `labels: parseLabels(labels())` in `sitesStore.update`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/sites/SiteDialogs.test.tsx`
Expected: PASS (all four tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/sites/SiteSettingsDialog.tsx frontend/src/components/sites/SiteDialogs.test.tsx
git commit -m "feat(sites): edit labels in site settings"
```

---

### Task 6: Labels in the dashboard header row

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx` (header block, current member-pill row around lines 111-130)

**Interfaces:**
- Consumes: `SiteLabels` (Task 3), `siteLabels` (Task 2), `site()` from `sitesStore.get`.
- Produces: no new exports.

- [ ] **Step 1: Render labels first in the existing pill row**

Replace the `<Show when={members()}>` gate with `<Show when={siteLabels(site() ?? {}).length > 0 || members()}>`; inside, render `<SiteLabels labels={siteLabels(site() ?? {})} />` before the manager `For`, and guard the member `For` blocks with `<Show when={members()}>`.

- [ ] **Step 2: Verify typecheck and full frontend suite**

Run: `cd frontend && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat(sites): show labels beside member pills on the dashboard"
```

---

### Task 7: Labels on the site card

**Files:**
- Modify: `frontend/src/components/sites/SiteCard.tsx`
- Test: `frontend/src/components/sites/SiteCard.test.tsx` (create)

**Interfaces:**
- Consumes: `SiteLabels` (Task 3), `siteLabels` (Task 2).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Mock the service so `onMount` stats fetch does not hit the network:

```tsx
// vi.mock('~/services/pocketbase', () => ({ pb: { send: vi.fn(() => Promise.reject(new Error('offline'))) } }));
// vi.mock('@solidjs/router', () => ({ useNavigate: () => () => {} }));
it('renders the site labels', () => {
  const host = mount(() => <SiteCard site={{ ...site, labels: ['production', 'acme'] }} />);
  expect(host.textContent).toContain('production');
  expect(host.textContent).toContain('acme');
});
```

Also assert an unlabeled site (`labels: undefined`) renders no label pills.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/sites/SiteCard.test.tsx`
Expected: FAIL — labels not rendered.

- [ ] **Step 3: Add `<SiteLabels labels={siteLabels(props.site)} />` under the name/tracking-id block** in `SiteCard.tsx`.

- [ ] **Step 4: Run tests and the full suite**

Run: `cd frontend && npx vitest run src/components/sites/SiteCard.test.tsx && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/sites/SiteCard.tsx frontend/src/components/sites/SiteCard.test.tsx
git commit -m "feat(sites): show labels on the site card"
```
