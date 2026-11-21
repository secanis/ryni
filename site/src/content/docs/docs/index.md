---
title: Overview
description: What Rýni is and how it works.
---

RÝNI is self-hosted, privacy-preserving web analytics in the spirit of
[Ackee](https://ackee.electerious.com/) — no cookies, no fingerprinting,
respects Do Not Track. It is built on the same stack as
[STJÓRNA](https://github.com/secanis/stjorna): SolidJS + PocketBase.

## Two tracking variants

One client script, two ways to deploy it:

- **Variant A (direct)** — the script posts straight to Rýni (cross-origin).
- **Variant B (proxy)** — the script posts to your own origin, which forwards
  to Rýni, so adblockers see only same-origin requests and can't block it.

## Features

- Per-site dashboards: views, unique visitors, average duration, bounce rate,
  live visitors, time-series, and referrer / browser / OS / device / screen /
  page breakdowns.
- Multiple websites, each with its own tracking id.
- Per-site roles: **viewer** (read) and **manager** (read, configure, share,
  delete). Any user can create a site and becomes its manager.
- One **global admin** (PocketBase superuser): user management, OIDC/SSO,
  backups.
- No cookies, no raw IP storage, honors Do Not Track.

## Getting around

- [Quick start](/docs/quickstart/) — run it with Docker Compose.
- [Tracking a website](/docs/tracking/) — the two snippets and how to wire them up.
- [Configuration](/docs/configuration/) — environment variables.
- [Privacy & GDPR](/docs/privacy/) — tracking tiers, device storage, and
  disclosure copy.
- [Helm](/docs/helm/) — install on Kubernetes.
- [SSO & backups](/docs/sso-and-backups/) — OIDC and instance backups.
- [Development](/docs/development/) — build from source.
