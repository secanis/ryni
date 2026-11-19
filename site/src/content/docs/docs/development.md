---
title: Development
description: Build Rýni from source.
---

## Frontend (SolidJS + Vite)

```bash
cd frontend && npm install && npm run dev
```

## Backend integration tests

Needs podman/docker; binds port 8091:

```bash
cd pocketbase && npm install && npm test
```

## Project structure

```
.
├── frontend/         # SolidJS frontend + tracker script (src/tracker/)
├── pocketbase/       # PocketBase backend: pb_migrations/, pb_hooks/, tests/
├── helm/ryni/        # Helm chart
├── site/             # this landing + docs site (Starlight)
├── scripts/          # Helm chart test rig (test-helm.sh)
├── docker-compose.yml
└── .github/workflows/ # ci.yml + release.yml + pages.yml
```

## CI / CD

- **CI** (`.github/workflows/ci.yml`) — frontend lint/typecheck/build/unit
  tests, PocketBase integration tests, and `helm lint` + template render.
- **CD** (`.github/workflows/release.yml`) — on a `v*` tag: runs CI, builds
  multi-arch images to Docker Hub, packages the chart, updates the Helm repo
  `index.yaml`, and publishes this site.

```bash
# Local chart checks
make lint-helm        # helm lint + render
make test-helm        # full kind-based end-to-end test
```
