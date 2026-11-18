# Local User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the global admin add, edit, delete and reset passwords for **local** (password) users from the `/admin/users` page.

**Architecture:** Frontend-only. The PocketBase superuser already bypasses collection rules, so the admin store drives `pb.collection('users').create/update/delete`, with `password` + `passwordConfirm` for credential changes. Two new modal dialogs (add/edit, reset password) sit on the existing read-only Users table, gated to local rows only.

**Tech Stack:** SolidJS, TypeScript, PocketBase SDK (`pocketbase@0.28.2`), Vitest (jsdom), lucide-solid icons.

**Spec:** `docs/superpowers/specs/2026-11-18-ryni-local-user-management.md`

## Global Constraints

- No migration, no server hook — rely on superuser bypassing `users` collection rules.
- Local user = `users` record with `role === 'user'` and `provider === null` (see `buildUserRows` in `src/stores/admin.ts`).
- Generated passwords must never be logged, written to the repo, or stored — only shown in the one-time confirmation and sent in the single create/update request.
- Password alphabet is unambiguous: exclude `0`, `O`, `1`, `l`, `I`.
- Follow existing patterns: `window.confirm` for destructive deletes (see `SiteSettingsDialog.tsx`), fixed-overlay modal markup, `vi.hoisted` + `vi.mock('~/services/pocketbase', …)` for store/component tests.

## Review Focus

1. Duplicate email on create → PB 400 must surface as an in-dialog error, not crash. *(Task 3 test)*
2. Generated password must never contain `0/O/1/l/I`. *(Task 1 test)*
3. Non-local (OIDC) rows and admin rows must show no Edit/Reset/Delete actions. *(Task 5 test)*
4. The generated password is shown exactly once, in a post-submit confirmation, with a copy button. *(Task 3 test)*
5. Delete is guarded by `window.confirm`; cancel aborts. *(Task 5 test)*

---

### Task 1: Password generator

**Files:**
- Create: `frontend/src/utils/password.ts`
- Test: `frontend/src/utils/password.test.ts`

**Interfaces:**
- Produces: `generatePassword(length?: number): string` — 16 chars by default.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generatePassword } from './password';

const AMBIGUOUS = /[0O1lI]/;

describe('generatePassword', () => {
  it('returns a string of the requested length', () => {
    expect(generatePassword(16)).toHaveLength(16);
    expect(generatePassword(24)).toHaveLength(24);
  });

  it('never emits ambiguous characters (0, O, 1, l, I)', () => {
    for (let i = 0; i < 100; i++) {
      expect(generatePassword()).not.toMatch(AMBIGUOUS);
    }
  });

  it('produces different values across calls', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- utils/password.test`
Expected: FAIL — `generatePassword` not exported / module not found.

- [ ] **Step 3: Implement `generatePassword(length = 16)` in `frontend/src/utils/password.ts`**

Alphabet (exact, 57 chars — lowercase minus `l`, uppercase minus `I` and `O`, digits `2-9`):
`const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';`
Fill `length` values from `crypto.getRandomValues(new Uint32Array(length))`, map each via `% ALPHABET.length`, join.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- utils/password.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/password.ts frontend/src/utils/password.test.ts
git commit -m "feat(users): add unambiguous password generator"
```

---

### Task 2: Admin store user CRUD

**Files:**
- Modify: `frontend/src/stores/admin.ts` (add four functions, export them on `adminStore`)
- Test: `frontend/src/stores/admin.test.ts` (extend)

**Interfaces:**
- Consumes: `pb.collection('users')` (already mocked in the test).
- Produces:
  - `createUser(data: { email: string; name: string; password: string }): Promise<void>`
  - `updateUser(id: string, data: { email: string; name: string }): Promise<void>`
  - `resetPassword(id: string, password: string): Promise<void>`
  - `deleteUser(id: string): Promise<void>`
  - Each calls `loadUsers()` after the write.

- [ ] **Step 1: Extend the test mock + write failing tests**

Extend the `vi.hoisted` mock in `admin.test.ts` so `collection()` returns `{ getOne, update, getFullList, create, delete }` (add `create: mock.create`, `delete: mock.delete` with `mock.create = vi.fn()`, `mock.delete = vi.fn()`). Then add:

```ts
it('createUser sends email/name/password + passwordConfirm and reloads', async () => {
  mock.create.mockResolvedValueOnce({});
  await adminStore.createUser({ email: 'a@b.c', name: 'A', password: 'pw' });
  expect(mock.create).toHaveBeenCalledWith({
    email: 'a@b.c', name: 'A', password: 'pw', passwordConfirm: 'pw',
  });
});

it('updateUser sends email/name only', async () => {
  mock.update.mockResolvedValueOnce({});
  await adminStore.updateUser('u1', { email: 'x@y.z', name: 'X' });
  expect(mock.update).toHaveBeenCalledWith('u1', { email: 'x@y.z', name: 'X' });
});

it('resetPassword sends password + passwordConfirm', async () => {
  mock.update.mockResolvedValueOnce({});
  await adminStore.resetPassword('u1', 'newpw');
  expect(mock.update).toHaveBeenCalledWith('u1', { password: 'newpw', passwordConfirm: 'newpw' });
});

it('deleteUser calls delete', async () => {
  mock.delete.mockResolvedValueOnce(true);
  await adminStore.deleteUser('u1');
  expect(mock.delete).toHaveBeenCalledWith('u1');
});
```

Note: `loadUsers()` runs after each write and hits `getFullList` three times (`users`, `_superusers`, `_externalAuths`); add `mock.getFullList.mockResolvedValue([])` before each action so reloads resolve.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- stores/admin.test`
Expected: FAIL — `adminStore.createUser` (etc.) is not a function.

- [ ] **Step 3: Implement the four functions in `frontend/src/stores/admin.ts`**

Each is a thin wrapper: `await pb.collection('users').create({ email, name, password, passwordConfirm: password })`, `.update(id, { email, name })`, `.update(id, { password, passwordConfirm: password })`, `.delete(id)` — followed by `await loadUsers()`. Add all four to the `adminStore` export object.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- stores/admin.test`
Expected: PASS (all existing + new).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/admin.ts frontend/src/stores/admin.test.ts
git commit -m "feat(users): add admin-store user CRUD + reset password"
```

---

### Task 3: Add/Edit user dialog

**Files:**
- Create: `frontend/src/components/admin/UserDialog.tsx`
- Test: `frontend/src/components/admin/UserDialog.test.tsx`

**Interfaces:**
- Consumes: `generatePassword` (Task 1), `adminStore.createUser` / `adminStore.updateUser` (Task 2), `type UserRow` from `~/stores/admin`, `CopyButton` from `~/components/ui/CopyButton`.
- Produces: `UserDialog(props: { mode: 'add' | 'edit'; user?: UserRow; onClose: () => void })` (default export).

- [ ] **Step 1: Write failing tests**

Mock `~/services/pocketbase` (`pb.collection` → `{ create, update }`), render `<UserDialog mode="add" onClose={…} />` in a host div, and assert:

```ts
// add mode auto-generates a password and shows it in the form
expect(host.textContent).toMatch(/[a-z0-9]/i); // some generated value rendered
// create success → one-time confirmation with the password + copy button
fireEvent(submit) → await vi.waitFor(() => expect(host.textContent).toContain('give this to the user')); 
// and the generated value reappears in the confirmation

// create failure (duplicate email) → error surfaced
mock.create.mockRejectedValueOnce(new Error('Email already exists'));
… expect(host.textContent).toContain('Email already exists');
```

Concrete assertions to pin: after mount, the generated-password input has a non-empty value; clicking the create button calls `mock.create` with `{ email, name, password, passwordConfirm: password }`; on resolve, text "won't be shown again" appears (use this exact copy string) and a `CopyButton` is present. For edit mode, `mock.update` is called with `{ email, name }` and no password.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- admin/UserDialog.test`
Expected: FAIL — `UserDialog` not found.

- [ ] **Step 3: Implement `UserDialog`**

Follow the `SiteSettingsDialog` overlay markup (`fixed inset-0 bg-black/40 …`). State: `email`, `name`, `password` (add only, seeded with `generatePassword()`), `busy`, `error`, `created` (the one-time confirmation string). Add mode shows email + name + a read-only password row with a **Regenerate** button (calls `generatePassword()`) and a `CopyButton`. Submit: add → `createUser({ email, name, password })` then `setCreated(password())`; edit → `updateUser(user.id, { email, name })` then `onClose()`. Confirmation view shows `created()` with a `CopyButton` and a "Done" button that calls `onClose()`. Catch errors into `error`. Use `untrack(() => …)` to seed edit-mode fields from `props.user`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- admin/UserDialog.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/UserDialog.tsx frontend/src/components/admin/UserDialog.test.tsx
git commit -m "feat(users): add/edit user dialog with generated password"
```

---

### Task 4: Reset-password dialog

**Files:**
- Create: `frontend/src/components/admin/ResetPasswordDialog.tsx`
- Test: `frontend/src/components/admin/ResetPasswordDialog.test.tsx`

**Interfaces:**
- Consumes: `generatePassword` (Task 1), `adminStore.resetPassword` (Task 2), `type UserRow`, `CopyButton`.
- Produces: `ResetPasswordDialog(props: { user: UserRow; onClose: () => void })` (default export).

- [ ] **Step 1: Write failing tests**

Mock `~/services/pocketbase`, render `<ResetPasswordDialog user={{ id: 'u1', email: 'a@b.c', name: 'A', role: 'user', provider: null }} onClose={…} />`, assert:

```ts
// generates a password on mount, shown with regenerate + copy
// clicking "Reset password" calls resetPassword('u1', <generated>)
await vi.waitFor(() => expect(mock.update).toHaveBeenCalledWith('u1', { password: expect.any(String), passwordConfirm: expect.any(String) }));
// then shows the one-time confirmation (same "won't be shown again" copy) with the new value
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- admin/ResetPasswordDialog.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ResetPasswordDialog`**

Same overlay markup. State: `password` (seeded `generatePassword()`), `busy`, `error`, `done`. Shows the target user's email/name, a read-only generated-password row with Regenerate + Copy, a confirm button "Reset password" that calls `resetPassword(user.id, password())` then `setDone(true)`, and a done state with `CopyButton` + "Done". Include the destructive warning line ("This replaces the user's current password.").

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- admin/ResetPasswordDialog.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/ResetPasswordDialog.tsx frontend/src/components/admin/ResetPasswordDialog.test.tsx
git commit -m "feat(users): add reset-password dialog"
```

---

### Task 5: Wire into the Users page

**Files:**
- Modify: `frontend/src/pages/admin/Users.tsx`
- Test: `frontend/src/pages/admin/Users.test.tsx`

**Interfaces:**
- Consumes: `UserDialog` (Task 3), `ResetPasswordDialog` (Task 4), `adminStore.deleteUser` (Task 2), `adminStore.users`, `auth.isSuperuser`.
- Produces: an "Add user" button and per-row Edit / Reset password / Delete actions, gated to `role === 'user' && provider === null`.

- [ ] **Step 1: Write failing tests**

Mock `~/stores/auth` (`isSuperuser: () => true`) and `~/stores/admin` (`users: () => rows`, `allSites: () => []`, `deleteUser: vi.fn()`). Render `<Users />` with rows:

```ts
const rows = [
  { id: 'u1', email: 'local@a.b', name: 'Local', role: 'user', provider: null },
  { id: 'u2', email: 'sso@a.b', name: 'SSO', role: 'user', provider: 'oidc' },
  { id: 'a1', email: 'admin@a.b', name: 'Admin', role: 'admin', provider: null },
];
```

Assert: an "Add user" button exists; the local row has `aria-label`s "Edit local@a.b", "Reset password for local@a.b", "Delete local@a.b"; the OIDC and admin rows have **no** such action buttons. Also: clicking delete calls `window.confirm`; when it returns false, `deleteUser` is not called.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- admin/Users.test`
Expected: FAIL — no action buttons / Add user button yet.

- [ ] **Step 3: Implement the wiring in `Users.tsx`**

Add an **Actions** column. Manage dialog state with signals: `dialog: { mode: 'add' } | { mode: 'edit'; user: UserRow } | null`, `resetting: UserRow | null`. Render `UserDialog` / `ResetPasswordDialog` inside `<Show>`. Add a header "Add user" button (icon `UserPlus`) that sets `dialog = { mode: 'add' }`. For each row, when `u.role === 'user' && u.provider === null`, render icon buttons: `Pencil` (edit), `KeyRound` (reset password), `Trash2` (delete → `window.confirm` then `adminStore.deleteUser(u.id)`). Use the `aria-label` strings from the test.

- [ ] **Step 4: Run tests + full suite to verify**

Run: `cd frontend && npm test -- admin/Users.test && npm run lint && npm run typecheck && npm test`
Expected: all PASS, lint clean, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/Users.tsx frontend/src/pages/admin/Users.test.tsx
git commit -m "feat(users): add user management actions to the admin table"
```

---

## Self-Review Notes

- Spec coverage: add (Task 3), edit (Task 3), delete (Tasks 2+5), reset/generate password (Tasks 1–4), anti-goal no-logging (Task 1 charset + one-time confirmation in 3/4), non-goal OIDC read-only (Task 5 gating).
- Types consistent: `generatePassword(length?)`, `createUser/updateUser/resetPassword/deleteUser` names reused verbatim across tasks.
- No disable/enable work included (explicitly dropped).
