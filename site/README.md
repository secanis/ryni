# RÝNI site (GitHub Pages)

The public site — landing page + docs — is a [Starlight](https://starlight.astro.build)
(Astro) project. `site/` holds the source; `npm run build` emits static HTML
to `site/dist/`.

It doubles as the Helm repository root: the chart `index.yaml`, `*.tgz`, and
`artifacthub-repo.yaml` (for Artifact Hub ownership verification) live at the
same root, so `helm repo add https://ryni.secanis.ch/` works from the same
site.

## Build

```bash
cd site
npm ci
npm run build          # outputs site/dist/
```

Set `PUBLIC_CHART_VERSION` to bake the current chart version into the landing
install snippet (the `--version` flag is omitted when it is unset, e.g. in
local dev).

## Deploy (`.github/workflows/pages.yml`)

GitHub Pages is configured with **GitHub Actions** as the source (custom
domain `ryni.secanis.ch`). `pages.yml` assembles one deploy artifact:

1. Checks out the repo and sets up Node.
2. Builds `site/` with `PUBLIC_CHART_VERSION` resolved from the latest release
   tag (falling back to `helm/ryni/Chart.yaml` before the first release).
3. Copies the Helm repo files (`index.yaml`, `*.tgz`,
   `artifacthub-repo.yaml`) from the `gh-pages` branch into `site/dist/` so a
   landing-page redeploy never drops the Helm repo.
4. Deploys `site/dist/` via `actions/deploy-pages`.

Triggers: push to `main` (changes under `site/`, `helm/ryni/README.md`, or
this workflow), `workflow_dispatch`, and `workflow_call` from `release.yml`
after each release updates the Helm index.

## Custom domain (GitHub Pages)

The custom domain is set at the repository level (GitHub **Settings → Pages**
→ `ryni.secanis.ch`), so it is managed by GitHub — `site/public/CNAME` is
carried in the artifact only as a fallback. To finish wiring it up:

1. In the repo's GitHub **Settings → Pages**, confirm the custom domain
   `ryni.secanis.ch` (GitHub verifies the CNAME).
2. Point DNS at GitHub Pages: add a `CNAME ryni` → `secanis.github.io`
   (or use `A`/`AAAA` records) — see
   [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Artifact Hub

Once the chart is published, register the Helm repo URL
(`https://ryni.secanis.ch/`) on [Artifact Hub](https://artifacthub.io).
`artifacthub-repo.yaml` (repo root) carries the ownership metadata Artifact Hub
uses to verify the repository.
