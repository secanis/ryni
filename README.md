# RÝNI

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

Set the site's **allowed origins** to your website's origin so the
cross-origin request is accepted.

**Variant B — proxy** (script + requests stay on your own origin):

```html
<script async src="/ryni.js" data-ryni-site="<tracking_id>"></script>
```

You must serve `/ryni.js` and forward `/t/` to Rýni from your own server.
See [`docs/variant-b-proxy.md`](docs/variant-b-proxy.md) for nginx and
framework examples.

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

## Environment

| Variable | Purpose |
|----------|---------|
| `PB_SECRET` | Encryption key (exactly 32 ASCII chars) |
| `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` | First global admin (created on first boot) |
| `PB_AUTOMIGRATE` | Run migrations on start (default `true`) |
| `PB_SUPERUSER_IPS` | Superuser IP allowlist |
| `RYNI_BACKUP_INTERVAL` | Cron expression for scheduled backups (empty = off) |

## Kubernetes / Helm

A Helm chart lives in [`helm/ryni`](helm/ryni) (single-replica PocketBase +
nginx-served frontend, Traefik/cert-manager Ingress, NetworkPolicies, and
data-safe Secrets/PVC with `resource-policy: keep`).

```bash
helm repo add ryni https://secanis.github.io/ryni/
helm repo update
helm install ryni ryni/ryni \
  --set ingress.hosts[0].host=analytics.example.com \
  --set pocketbase.persistence.storageClass=longhorn
```

Fetch the auto-generated superuser credentials after install:

```bash
kubectl get secret -n ryni ryni-pocketbase-superuser \
  -o jsonpath='{.data.PB_SUPERUSER_EMAIL}' | base64 -d; echo
kubectl get secret -n ryni ryni-pocketbase-superuser \
  -o jsonpath='{.data.PB_SUPERUSER_PASSWORD}' | base64 -d; echo
```

See [`helm/ryni/README.md`](helm/ryni/README.md) for the full parameter list
and data-safety notes.

## CI / CD

- **CI** (`.github/workflows/ci.yml`) — frontend lint/typecheck/build/unit
  tests, PocketBase integration tests, and `helm lint` + template render.
- **CD** (`.github/workflows/release.yml`) — on a `v*` tag: runs CI, builds
  multi-arch (amd64/arm64) images to Docker Hub, packages the chart, attaches
  it to the release, and updates the Helm repo `index.yaml` on `gh-pages`.

```bash
# Local chart checks
make lint-helm        # helm lint + render
make test-helm        # full kind-based end-to-end test
```

## Development

```bash
# Frontend (SolidJS + Vite)
cd frontend && npm install && npm run dev

# Backend integration tests (needs podman/docker; binds 8091)
cd pocketbase && npm install && npm test
```

## Project structure

```
.
├── frontend/         # SolidJS frontend + tracker script (src/tracker/)
├── pocketbase/       # PocketBase backend: pb_migrations/, pb_hooks/, tests/
├── helm/ryni/        # Helm chart
├── scripts/          # Helm chart test rig (test-helm.sh)
├── docker-compose.yml
└── .github/workflows/ # ci.yml + release.yml
```

## License

[AGPL-3.0-or-later](LICENSE)
