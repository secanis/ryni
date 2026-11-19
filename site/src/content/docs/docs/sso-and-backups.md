---
title: SSO & backups
description: OIDC single sign-on and instance backups.
---

## SSO via OIDC

Rýni supports single sign-on through any OpenID Connect (OIDC) provider. The
global admin configures the provider (issuer, client id, client secret) in the
admin settings; the OIDC provider is registered on the `users` collection as a
PocketBase OAuth2 provider.

- OIDC **authenticates** the user — it does **not** grant global admin. Roles
  are assigned separately (any user can create a site and becomes its manager;
  viewer/manager roles are granted per site).
- Local email/password login remains available as a fallback.

## Backups

Rýni backs up the whole instance (a zip of `pb_data`) via PocketBase's
`/api/backups` endpoint.

- **Manual** — in the admin settings, **Create backup** snapshots the
  instance and lists existing backups for download.
- **Scheduled** — set `RYNI_BACKUP_INTERVAL` to a cron expression
  (e.g. `0 4 * * *` for daily at 04:00). Leave it empty to disable scheduled
  backups.

Backups are full-instance, not per-site: Rýni is single-tenant per deployment,
so one backup covers every site on the instance.
