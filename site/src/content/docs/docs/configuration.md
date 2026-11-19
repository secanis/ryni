---
title: Configuration
description: Environment variables that configure a Rýni instance.
---

| Variable | Purpose |
|----------|---------|
| `PB_SECRET` | Encryption key (exactly 32 ASCII chars) |
| `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` | First global admin (created on first boot) |
| `PB_AUTOMIGRATE` | Run migrations on start (default `true`) |
| `PB_SUPERUSER_IPS` | Superuser IP allowlist |
| `RYNI_BACKUP_INTERVAL` | Cron expression for scheduled backups (empty = off) |

Set these in your `.env` (Docker Compose) or as container environment
variables (Helm/values.yaml).
