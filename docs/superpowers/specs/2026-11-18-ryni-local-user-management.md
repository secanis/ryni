# Rýni — local user management (design)

## Intent

Let the global admin manage **local** (password) users from the `/admin/users`
page: add, edit, delete, and generate/reset passwords. A "local" user is a
`users`-collection record with a password and no OIDC link.

## Goals

- Add a local user — email + name + generated initial password.
- Edit a local user — name + email.
- Delete a local user (with confirm, destructive).
- Generate a password on add; reset a password on demand. Generated passwords
  are shown exactly once with a copy button.

## Non-goals

- Disable/enable (explicitly dropped for now).
- Managing OIDC users (read-only; their IdP governs login).
- Managing the superuser / global admin.
- Email-based "forgot password" flow.
- Managing site memberships here (already done elsewhere).

## Anti-goals

- Never write a generated password to logs, the repo, session memory, or any
  file. It exists only in the one-time confirmation dialog and the single
  create/update request that sets it.

## Constraints

- PocketBase v0.40.6. Superusers bypass collection rules, so the admin can
  `create` / `update` / `delete` records in `users` and set `password` +
  `passwordConfirm` via the collection API. **No migration, no server hook.**
- `users` already has `name` (migration `1740000000_create_ryni_collections.js`);
  `password`/`email` are built-in. Email is unique in PB.
- Local vs OIDC is already known by the admin table: a `users` record is local
  iff it has no `_externalAuths` link (the existing `provider` badge is null).

## Approaches

1. **Collection API directly (chosen).** The admin store calls
   `pb.collection('users').create/update/delete`, password via `password` +
   `passwordConfirm`. Superuser already has full access; no new backend surface.
2. Custom `pb_hooks` routes (`/api/ryni/users` CRUD) — rejected: re-implements
   what the SDK + superuser already provide, more code and more surface for no
   benefit here.

## How (decided)

- `/admin/users` table gains an **"Add user"** button and per-row actions
  (**Edit**, **Reset password**, **Delete**) on **local** rows only. OIDC and
  admin rows show no actions.
- Add and Edit open a modal dialog.
- Password generation: 16 chars from an unambiguous alphabet (no `0/O`, `1/l/I`)
  via `crypto.getRandomValues`, with regenerate + copy buttons. On submit the
  password is shown once in a confirmation ("give this to the user; it won't be
  shown again"), then dropped.
- Reset password: same generator, same one-time confirmation.
- Delete shows a confirm step.

## Open (builder settles)

- Field validation details (email format, name required; duplicate email
  surfaced from PB's error response).
- Exact wording of the one-time confirmation and delete confirmation.
