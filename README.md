# RÝNI

[![CI](https://github.com/secanis/ryni/actions/workflows/ci.yml/badge.svg)](https://github.com/secanis/ryni/actions/workflows/ci.yml)
[![ryni-pocketbase](https://img.shields.io/docker/v/secanis/ryni-pocketbase?sort=semver&label=pocketbase)](https://hub.docker.com/r/secanis/ryni-pocketbase)
[![ryni-frontend](https://img.shields.io/docker/v/secanis/ryni-frontend?sort=semver&label=frontend)](https://hub.docker.com/r/secanis/ryni-frontend)
[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/ryni)](https://artifacthub.io/packages/helm/ryni/ryni)

Self-hosted, privacy-preserving web analytics in the spirit of Ackee — no
cookies, respects Do Not Track, built on the same stack as
[STJÓRNA](https://github.com/secanis/stjorna) (SolidJS + PocketBase).

Two integration variants, both driven by the same client script:

- **Variant A (direct)** — the script posts straight to Rýni (cross-origin).
- **Variant B (proxy)** — the script posts to your site's own origin, which
  forwards to Rýni, so adblockers see only same-origin requests and can't
  block it.

## Quick start

```bash
cp .env.example .env
# Edit .env to set PB_SECRET (32 chars: `openssl rand -hex 16`) and
# PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD.

docker compose up -d

# Dashboard:  http://localhost:3000
# Sign in with PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD (the global admin).
```

## Tracking a website

Create a site in the dashboard (Sites → Add site). You'll get two snippets.

**Variant A — direct** (script served from Rýni, posts cross-origin):

```html
<script async src="https://ryni.example/ryni.js"
        data-ryni-server="https://ryni.example"
        data-ryni-site="<tracking_id>"></script>
```

**Variant B — proxy** (script + requests stay on your own origin):

```html
<script async src="/ryni.js" data-ryni-site="<tracking_id>"></script>
```

Add `data-ryni-detailed` to re-fire on single-page-app route changes.

## Features

- Per-site dashboard: views, unique visitors, average duration, bounce rate,
  live visitors, time-series, and referrer / browser / OS / device / screen /
  page breakdowns.
- Multiple websites, each with a tracking id.
- Per-site permissions: **viewer** (read) and **manager** (read, configure,
  share, delete); any user can create a site and becomes its manager.
- One **global admin** (PocketBase superuser): user management, OIDC/SSO,
  backups.
- SSO via OIDC.
- Scheduled + manual backups.
- No cookies, no raw IP storage, honors Do Not Track.
- Configurable privacy tiers (Standard / Session / Minimal) with generated GDPR
  disclosure text and an optional banner.

## Documentation

Full operator docs — configuration, environment variables, Helm, the Variant B
proxy setup, SSO and backups, and development — live at
<https://ryni.secanis.ch/docs/>.

## License

[AGPL-3.0-or-later](LICENSE)
