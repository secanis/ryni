# RÝNI site (gh-pages)

Minimal landing page published to the `gh-pages` branch by the
`publish-site` job in `.github/workflows/release.yml`. It doubles as the
Helm repository root: the chart `index.yaml` (written by `release-helm`) and
`artifacthub-repo.yaml` (for Artifact Hub ownership verification) live at the
same root.

- `index.html` — the landing page. The `@@CHART_VERSION@@` placeholder is
  substituted with the release's chart version at publish time.
- `CNAME` — pins the custom domain `ryni.secanis.ch`.
- The page (and Helm repo) are served at `https://ryni.secanis.ch/`.

## Custom domain (GitHub Pages)

The `site/CNAME` file (`ryni.secanis.ch`) is rsynced to the `gh-pages` root
on every publish (the publish job uses `--filter='P CNAME'` so it is never
deleted). To finish wiring it up:

1. In the repo's GitHub **Settings → Pages**, set the custom domain
   `ryni.secanis.ch` (GitHub will confirm the CNAME).
2. Point DNS at GitHub Pages: add a `CNAME ryni` → `secanis.github.io`
   (or use `A`/`AAAA` records) — see
   [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

The site is static (no build step), so Pages can serve the `gh-pages` branch
directly.

## Artifact Hub

Once the chart is published, register the Helm repo URL
(`https://ryni.secanis.ch/`) on [Artifact Hub](https://artifacthub.io).
`artifacthub-repo.yaml` (repo root) carries the ownership metadata Artifact Hub
uses to verify the repository.
