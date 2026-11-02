# RÝNI site (gh-pages)

Minimal landing page published to the `gh-pages` branch by the
`publish-site` job in `.github/workflows/release.yml`. It doubles as the
Helm repository root: the chart `index.yaml` (written by `release-helm`) and
`artifacthub-repo.yaml` (for Artifact Hub ownership verification) live at the
same root.

- `index.html` — the landing page. The `@@CHART_VERSION@@` placeholder is
  substituted with the release's chart version at publish time.
- The page is served at `https://secanis.github.io/ryni/`.

## Custom domain (GitHub Pages)

To serve this on your own domain:

1. Create a `CNAME` file containing the domain (e.g. `analytics.example.com`)
   here in `site/`. The publish job rsyncs it over (`--filter='P CNAME'`
   preserves it across re-publishes).
2. In the repo's GitHub **Settings → Pages**, set the same custom domain.
3. Point DNS (a `CNAME` or `A`/`AAAA` records) at GitHub Pages — see
   [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

The site is static (no build step), so Pages can serve the `gh-pages` branch
directly.

## Artifact Hub

Once the chart is published, register the Helm repo URL
(`https://secanis.github.io/ryni/`) on [Artifact Hub](https://artifacthub.io).
`artifacthub-repo.yaml` (repo root) carries the ownership metadata Artifact Hub
uses to verify the repository.
