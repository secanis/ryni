# RÝNI site (GitHub Pages)

Minimal landing page published with the official GitHub Pages Actions
deployment (`.github/workflows/pages.yml`). It doubles as the Helm repository
root: the chart `index.yaml`, `*.tgz`, and `artifacthub-repo.yaml` (for
Artifact Hub ownership verification) live at the same root, so
`helm repo add https://ryni.secanis.ch/` works from the same site.

GitHub Pages is configured with **GitHub Actions** as the source (custom
domain `ryni.secanis.ch`). `pages.yml` assembles one deploy artifact from:

- `site/` — the landing page. The `@@CHART_VERSION@@` placeholder is
  substituted with the latest release's chart version (falling back to
  `helm/ryni/Chart.yaml` before the first release).
- the `gh-pages` branch — the Helm repo files (`index.yaml`, `*.tgz`,
  `artifacthub-repo.yaml`) written by the `release-helm` job in
  `release.yml`. They are copied into the artifact so a landing-page redeploy
  never drops the Helm repo.

Triggers: push to `main` (changes under `site/`), `workflow_dispatch`, and
`workflow_call` from `release.yml` after each release updates the Helm index.

## Custom domain (GitHub Pages)

The custom domain is set at the repository level (GitHub **Settings → Pages**
→ `ryni.secanis.ch`), so it is managed by GitHub — the `site/CNAME` file is
carried in the artifact only as a fallback. To finish wiring it up:

1. In the repo's GitHub **Settings → Pages**, confirm the custom domain
   `ryni.secanis.ch` (GitHub verifies the CNAME).
2. Point DNS at GitHub Pages: add a `CNAME ryni` → `secanis.github.io`
   (or use `A`/`AAAA` records) — see
   [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

The site is static (no build step); `pages.yml` just assembles the files and
hands them to `actions/deploy-pages`.

## Artifact Hub

Once the chart is published, register the Helm repo URL
(`https://ryni.secanis.ch/`) on [Artifact Hub](https://artifacthub.io).
`artifacthub-repo.yaml` (repo root) carries the ownership metadata Artifact Hub
uses to verify the repository.
