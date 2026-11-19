---
title: Quick start
description: Run Rýni with Docker Compose.
---

The fastest way to run Rýni is with Docker Compose.

## 1. Copy and edit the environment file

```bash
cp .env.example .env
```

Set `PB_SECRET` (exactly 32 ASCII chars — `openssl rand -hex 16`) and
`PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD`.

## 2. Start the stack

```bash
docker compose up -d
```

## 3. Sign in

Open the dashboard:

```text
http://localhost:3000
```

Sign in with `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` — that's the
global admin, created on first boot.

Next: [create a site and start tracking](/docs/tracking/).
