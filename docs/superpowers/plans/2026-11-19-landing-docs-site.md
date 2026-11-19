# Rýni Landing + Docs Site (Starlight) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single static `site/index.html` with a Starlight (Astro) site — a landing page at `/` and operator docs under `/docs/` — styled with the Rýni design language and deployed to `ryni.secanis.ch` without breaking the Helm repo it hosts.

**Architecture:** A self-contained Astro/Starlight project in `site/` (npm, TypeScript). Docs are Markdown in `src/content/docs/docs/` (so URLs start `/docs/`); a custom `src/pages/index.astro` overrides `/` as the marketing landing. The design language is ported onto Starlight's CSS custom properties in `src/styles/custom.css`; fonts come from the same `@fontsource/*` packages the app already uses. `pages.yml` builds the site (with the chart version injected as `PUBLIC_CHART_VERSION`) and merges the `gh-pages` Helm repo files (`index.yaml`, `*.tgz`, `artifacthub-repo.yaml`) into `dist/` before deploying.

**Tech Stack:** Astro 5, @astrojs/starlight, TypeScript, `@fontsource/inter` / `@fontsource/sora` / `@fontsource/jetbrains-mono`, npm, Node 24 (CI).

**Spec:** `docs/superpowers/specs/2026-11-19-landing-docs-design.md` (and, for tokens/fonts, `docs/superpowers/specs/2026-11-16-ryni-design-language.md`). The plan argues from the spec; executors read both.

## Global Constraints

- Site lives in `site/`; it is a separate npm project from `frontend/` (own `package.json`, `node_modules`, lockfile).
- Static output only — no external requests from visitors. Fonts are self-hosted via `@fontsource/*` (bundled woff2), never Google Fonts / CDN.
- Canonical Helm repo URL everywhere is `https://ryni.secanis.ch/`. No `secanis.github.io/ryni/`.
- Dark theme is the default (Polar Night); light (Glacier) is selectable via Starlight's theme toggle.
- Design tokens are the app's exact values: accent `#4EE6A8` (dark) / `#0BA477` (light), text-on-accent `#0D1120`, fonts Inter 400/500/600 + Sora 600/700 + JetBrains Mono 500/600/700 (see design-language spec §Design tokens / §Typography).
- `npm run build` in `site/` must succeed and emit `site/dist/`; the Helm repo files must survive every redeploy.
- Actions are pinned to commit SHAs (version in a trailing `# vN` comment), matching the existing workflows. Node 24 in CI.

## Review Focus

The spec's vision leaves these input classes / failure modes most likely to bite a real user; each is pinned by a test in the owning task.

1. **Helm repo regression** — a landing-page redeploy that drops `index.yaml` / `*.tgz` / `artifacthub-repo.yaml` breaks `helm repo add` + `helm install` for every existing user. Pin: after build+merge, `dist/index.yaml` and `dist/artifacthub-repo.yaml` exist and are non-empty (Task 5).
2. **Stale `helm repo add` URL** — docs/README carrying `secanis.github.io/ryni/` ships a broken install command. Pin: `rg secanis.github.io` returns nothing in `site/src`, `README.md`, `helm/ryni/README.md` (Task 6).
3. **External font/CDN leak** — a Google Fonts or CDN reference contradicts the privacy positioning. Pin: built `dist/**` contains no `fonts.googleapis`, `fonts.gstatic`, or `@font-face` pointing off-site (Task 2).
4. **Placeholder leak** — the install snippet showing a literal `@@CHART_VERSION@@` or an unrendered version. Pin: `dist/index.html` contains a concrete version when `PUBLIC_CHART_VERSION` is set, and never the literal `@@CHART_VERSION@@` (Task 5).
5. **Docs reachability** — landing at `/` and docs at `/docs/...` both resolve (not a 404, not collapsed into one page). Pin: `dist/index.html` and `dist/docs/quickstart/index.html` (or `.html`) exist after build (Task 4).

---

### Task 1: Scaffold the Starlight project in `site/`

**Files:**
- Delete: `site/index.html` (replaced by `src/pages/index.astro` later)
- Move: `site/CNAME` → `site/public/CNAME`
- Create: Starlight scaffold in `site/` (`astro.config.mjs`, `package.json`, `tsconfig.json`, `src/content.config.ts`, `src/content/docs/**`, `public/favicon.svg`, `.gitignore`)
- Keep: `site/README.md` (updated in Task 6)

**Interfaces:**
- Produces: a buildable `site/` npm project; `npm run build` emits `site/dist/`. Later tasks edit files inside this project.

- [ ] **Step 1: Clear the static files**

```bash
cd site
rm -f index.html
mkdir -p public
mv CNAME public/CNAME
```

- [ ] **Step 2: Scaffold Starlight + install deps**

```bash
cd site
npm create astro@latest . -- --template starlight --no-git --yes
npm install
npm install @fontsource/inter @fontsource/sora @fontsource/jetbrains-mono
```

- [ ] **Step 3: Verify build**

```bash
cd site && npm run build
```

Expected: exits 0; `ls site/dist` shows `index.html`, `favicon.svg`, and a `guides/` (or template) doc page; `site/dist/CNAME` exists.

- [ ] **Step 4: Commit**

```bash
git add site/
git commit -m "build(site): scaffold Starlight docs site"
```

---

### Task 2: Port the design language (tokens + fonts + dark default)

**Files:**
- Create: `site/src/styles/custom.css`
- Modify: `site/astro.config.mjs` (register `customCss`, set `title`, `head` dark-default script)

**Interfaces:**
- Consumes: the Starlight project from Task 1.
- Produces: a site whose chrome (bg, text, sidebar, links, accent, fonts) matches the app, dark by default. Tasks 3–4 inherit the styling.

- [ ] **Step 1: Write the token port in `site/src/styles/custom.css`**

Top of the file, self-host the fonts (Vite resolves these bare CSS `@import`s from node_modules):

```css
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/sora/600.css";
@import "@fontsource/sora/700.css";
@import "@fontsource/jetbrains-mono/500.css";
@import "@fontsource/jetbrains-mono/600.css";
@import "@fontsource/jetbrains-mono/700.css";
```

Then map Starlight's variables to the Rýni tokens (port the full base/surface/text/accent tables from the design-language spec §Design tokens, 1:1; light on `:root`, dark under `[data-theme='dark']`):

- `--sl-color-accent` → `#0BA477` (light) / `#4EE6A8` (dark)
- `--sl-color-accent-high` → a slightly darker `accent` for hover
- `--sl-color-text-accent` → `#0D1120` in both themes (text on the solid accent)
- `--sl-color-bg` / `--sl-color-bg-nav` / `--sl-color-bg-sidebar` → `bg` / `surface`
- `--sl-color-bg-inline-code` → `surface-2`
- `--sl-color-text` / `--sl-color-text-1..5` → `text` / `muted` / `faint`
- `--sl-color-gray-*` → `border` / `border-strong` / `muted` ramp
- `--sl-font` → `'Inter', system-ui, sans-serif`; `--sl-font-mono` → `'JetBrains Mono', ui-monospace, monospace`
- Add `h1,h2,h3,h4,h5,h6 { font-family: 'Sora','Inter',sans-serif; }`

Use the exact hex values from `frontend/src/index.css` (which already implements both themes), not the spec prose.

- [ ] **Step 2: Register the stylesheet, set title, force dark default in `site/astro.config.mjs`**

```js
starlight({
  title: 'RÝNI',
  customCss: ['./src/styles/custom.css'],
  head: [
    {
      tag: 'script',
      content: `document.documentElement.dataset.theme = 'dark';`,
    },
  ],
  // ... rest
})
```

- [ ] **Step 3: Verify no external font/CDN references**

```bash
cd site && npm run build
rg -n "fonts.googleapis|fonts.gstatic|fonts.gstatic.com" dist || echo "no external fonts"
```

Expected: build passes; the `rg` prints `no external fonts`. (The `@fontsource` woff2 files are emitted under `dist/_astro/` and referenced relatively.)

- [ ] **Step 4: Commit**

```bash
git add site/src/styles/custom.css site/astro.config.mjs
git commit -m "feat(site): port Rýni design language (tokens, fonts, dark default)"
```

---

### Task 3: Landing page (`/`)

**Files:**
- Create: `site/src/pages/index.astro`
- Modify: `site/src/content/docs/docs/` is created in Task 4 (landing only overrides `/`)

**Interfaces:**
- Consumes: the styling from Task 2; `import.meta.env.PUBLIC_CHART_VERSION` (set by CI in Task 5).
- Produces: the marketing landing at `/` with a standalone shell (wordmark + "Docs" + GitHub link + theme toggle), no sidebar/search.

- [ ] **Step 1: Write the landing page `site/src/pages/index.astro`**

A standalone page (own `<header>`/`<main>`/`<footer>`, not Starlight's docs layout) containing:

- Hero: "RÝNI" wordmark with the aurora-green accent dot; tagline "Self-hosted, privacy-preserving web analytics — no cookies, no fingerprinting, respects Do Not Track".
- Feature highlights (from README §Features): per-site dashboards, Variant A/B tracking, per-site roles + global admin with SSO, backups, no cookies / DNT.
- Quick install: the docker compose block (from README §Quick start) and the Helm block, with `--version` rendered only when `import.meta.env.PUBLIC_CHART_VERSION` is set:

```astro
---
const version = import.meta.env.PUBLIC_CHART_VERSION;
---
```

Render `--version ${version}` in the Helm snippet only when `version` is truthy.

- Links: GitHub, Helm repo (`https://ryni.secanis.ch/`), Docker Hub, Artifact Hub, plus a prominent "Read the docs" link to `/docs/`.
- Footer: AGPL-3.0-or-later note.

- [ ] **Step 2: Verify build + content**

```bash
cd site && npm run build
test -f dist/index.html && echo "landing present"
rg -n "RÝNI|privacy-preserving|Read the docs" dist/index.html
```

Expected: build passes; landing present; the three strings match.

- [ ] **Step 3: Commit**

```bash
git add site/src/pages/index.astro
git commit -m "feat(site): landing page with install snippets"
```

---

### Task 4: Docs pages (`/docs/`) + sidebar

**Files:**
- Create (all under `site/src/content/docs/docs/`, so URLs start `/docs/`):
  - `index.mdx` (overview)
  - `quickstart.mdx`
  - `tracking.mdx`
  - `configuration.mdx`
  - `helm.mdx`
  - `sso-and-backups.mdx`
  - `development.mdx`
- Delete: the scaffold's `site/src/content/docs/index.mdx` and `site/src/content/docs/guides/**`
- Modify: `site/astro.config.mjs` (sidebar)

**Interfaces:**
- Consumes: Task 2 styling.
- Produces: `/docs/`, `/docs/quickstart/`, `/docs/tracking/`, `/docs/configuration/`, `/docs/helm/`, `/docs/sso-and-backups/`, `/docs/development/` with a sidebar.

- [ ] **Step 1: Write the seven docs pages**

Migrate content (verbatim where it's already good, no invented config):

- `index.mdx` — overview: what Rýni is, key features, how it compares to Ackee/STJÓRNA, the two tracking variants (README §Features + top matter).
- `quickstart.mdx` — docker compose install (README §Quick start).
- `tracking.mdx` — Variant A + B snippets, allowed origins, `data-ryni-detailed` for SPAs, and the full Variant B proxy detail (all of `docs/variant-b-proxy.md`, including the `Sec-Fetch-Site` note).
- `configuration.mdx` — the environment-variable table (README §Environment).
- `helm.mdx` — Helm install, first-login secret fetch, important notes, and the parameter table (all of `helm/ryni/README.md`, with the URL fixed to `https://ryni.secanis.ch/`).
- `sso-and-backups.mdx` — OIDC/SSO, scheduled + manual backups (README features list, expanded).
- `development.mdx` — frontend/backend dev, project structure, CI/CD notes (README §Development / §CI / §Project structure).

Each page has frontmatter `title` and `description`.

- [ ] **Step 2: Configure the sidebar in `site/astro.config.mjs`**

Ordered sidebar linking the seven pages with labels: Overview, Quick start, Tracking a website, Configuration, Helm, SSO & backups, Development. Point the sidebar at the `docs/` subfolder so `/docs/...` URLs resolve.

- [ ] **Step 3: Verify build + docs reachability**

```bash
cd site && npm run build
for p in docs docs/quickstart docs/tracking docs/configuration docs/helm docs/sso-and-backups docs/development; do
  test -f "dist/$p/index.html" || echo "MISSING $p"
done
```

Expected: build passes; no `MISSING` lines (every path emitted an `index.html`). Also confirm the built-in search shipped: `test -d dist/pagefind && echo "search present"` (Starlight bundles Pagefind by default; if `pagefind/` is absent, enable it rather than silently shipping no search).

- [ ] **Step 4: Commit**

```bash
git add site/src/content site/astro.config.mjs
git commit -m "docs(site): migrate operator docs into Starlight"
```

---

### Task 5: Rewrite `pages.yml` (build + Helm merge + version)

**Files:**
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: the buildable `site/` (Tasks 1–4) and `import.meta.env.PUBLIC_CHART_VERSION` (Task 3).
- Produces: a deploy workflow that builds `site/`, injects the chart version, merges the `gh-pages` Helm repo files into `dist/`, and deploys `dist/`. `release.yml` keeps calling it unchanged.

- [ ] **Step 1: Widen the push trigger**

In `on.push.paths`, add `- 'helm/ryni/README.md'` (keeps `/docs/helm/` in sync when the chart README changes).

- [ ] **Step 2: Add the Node setup + build**

After `actions/checkout`, add `actions/setup-node` pinned to the same SHA as `ci.yml` (`a0853c24544627f65ddf259abe73b1d18a591444 # v5`), `node-version: '24'`, `cache: npm`, `cache-dependency-path: site/package-lock.json`. Then replace the `sed` assemble step with:

```bash
cd site
npm ci
PUBLIC_CHART_VERSION="$CHART_VERSION" npm run build
```

- [ ] **Step 3: Merge the Helm repo files into `dist/`**

Keep the existing `git fetch origin gh-pages` + `git worktree` logic, but target `site/dist/` instead of `_site/`: copy `index.yaml`, `*.tgz`, `artifacthub-repo.yaml` into `site/dist/`. Keep the repo-root `artifacthub-repo.yaml` fallback copy. `CNAME` now arrives via `public/` (no manual `cp site/CNAME`). Remove the old `@@CHART_VERSION@@` placeholder check.

- [ ] **Step 4: Point the deploy at `dist/`**

`actions/upload-pages-artifact` `path:` → `site/dist`.

- [ ] **Step 5: Verify Helm repo survival + version injection**

```bash
cd site && PUBLIC_CHART_VERSION="0.1.0" npm run build
test -f dist/index.html && grep -q "0.1.0" dist/index.html && echo "version injected"
! grep -q "@@CHART_VERSION@@" dist/index.html && echo "no placeholder"
```

Expected: both `echo`s print; no placeholder. (The gh-pages merge is exercised in CI on deploy; the YAML change is reviewed by eye here — see Review Focus #1.)

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/pages.yml
git commit -m "ci(site): build Starlight site and merge Helm repo into dist"
```

---

### Task 6: Shrink README, remove `variant-b-proxy.md`, fix Helm URL, update maintainer notes

**Files:**
- Modify: `README.md` (shrink to getting-started on-ramp)
- Delete: `docs/variant-b-proxy.md`
- Modify: `helm/ryni/README.md` (fix URL to `https://ryni.secanis.ch/`)
- Modify: `site/README.md` (describe the build step + Helm-root merge)

**Interfaces:**
- Consumes: nothing new.
- Produces: single-source-of-truth split — README = quick on-ramp, site = full operator docs.

- [ ] **Step 1: Shrink `README.md`**

Keep: tagline, docker compose quickstart, both tracking snippets (brief), the features list, license, and a "full docs → https://ryni.secanis.ch/docs/" link. Remove: the environment-variable table, Helm install/values section, development/project-structure detail (now in the site). Fix the `helm repo add` URL to `https://ryni.secanis.ch/`.

- [ ] **Step 2: Delete `docs/variant-b-proxy.md`**

Content now lives in `/docs/tracking/`.

- [ ] **Step 3: Fix `helm/ryni/README.md` URL**

Replace `https://secanis.github.io/ryni/` with `https://ryni.secanis.ch/`.

- [ ] **Step 4: Update `site/README.md`**

Rewrite to describe the Starlight build (`npm ci && npm run build` → `dist/`), the `PUBLIC_CHART_VERSION` injection, and the gh-pages Helm-root merge in `pages.yml`. Drop the "static, no build step" wording.

- [ ] **Step 5: Verify no stale URL remains**

```bash
rg -n "secanis.github.io" README.md helm/ryni/README.md site/ docs/ || echo "no stale URL"
```

Expected: prints `no stale URL`.

- [ ] **Step 6: Commit**

```bash
git add README.md helm/ryni/README.md site/README.md
git rm docs/variant-b-proxy.md
git commit -m "docs: site becomes canonical operator docs; fix Helm repo URL"
```

---

### Task 7 (recommended addition): Gate the site build in CI

> Beyond the spec's literal "pages.yml only" scope — drop if you want strict scope.

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the buildable `site/` (Task 1).
- Produces: a `test-site` job so a PR that breaks the site build fails CI before it can break the deploy.

- [ ] **Step 1: Add a `test-site` job to `ci.yml`**

Mirror `test-frontend`: `actions/checkout`, `actions/setup-node` (node 24, `cache: npm`, `cache-dependency-path: site/package-lock.json`), `npm ci`, `npm run build` (in `site/`). No lint/test script exists in the site project yet.

- [ ] **Step 2: Verify + commit**

```bash
# locally:
cd site && npm ci && npm run build
```

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gate site build on PR"
```
