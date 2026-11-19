# Rýni — Landing page + documentation site (Starlight)

Date: 2026-11-19
Status: draft (awaiting approval)
Size: project

## Intent & why

Rýni's public presence is a single static `index.html` in `site/`, published
to `https://ryni.secanis.ch` by GitHub Pages. It is a flat install card: a few
Helm commands, a "why" list, two links. All real documentation lives off-site
in `README.md`, `docs/variant-b-proxy.md`, and `helm/ryni/README.md`, scattered
and not reachable from the site. The site also looks off-brand: plain slate,
while the dashboard app now has a distinct Iceland-derived identity (dark
"Polar Night" + light "Glacier", aurora accent, Sora/Inter/JetBrains Mono).

We want a proper landing page plus a separate docs section, built with
**Starlight** (Astro docs theme) and styled with the same design language as
the app, so an operator lands, understands the product, installs it, and reads
the full operator docs in one place.

## Goals

- Landing page (`/`) — hero, tagline, feature highlights, quick install
  (docker compose + both tracking snippets), links.
- Docs section (`/docs/`) — full operator documentation migrated from
  `README.md`, `docs/variant-b-proxy.md`, and `helm/ryni/README.md`, with
  sidebar navigation and search.
- Styled with the Rýni design language (`docs/superpowers/specs/2026-11-16-ryni-design-language.md`):
  same colors, same fonts, dark "Polar Night" default with light "Glacier".
- Self-hosted fonts and static-only output — no external requests from the
  visitor (privacy product).
- Preserve the existing GitHub Pages contract: the site root doubles as the
  Helm repo root (`index.yaml`, `*.tgz`, `artifacthub-repo.yaml`), and the
  custom domain `ryni.secanis.ch` keeps working.

## Non-goals

- No change to the dashboard app (frontend/) — this is the public site only.
- No i18n — English only, matching the app.
- No dynamic/backend content — the site is fully static at deploy time.
- No changes to the Helm chart or its release flow beyond what the new build
  step requires.

## Anti-goals

- Do not break the Helm repo: a landing-page redeploy must never drop
  `index.yaml` / `*.tgz` / `artifacthub-repo.yaml`.
- Do not introduce external font/CDN requests — contradicts the privacy
  positioning and the app's "self-host fonts" rule.
- Do not over-build the landing page into a marketing site with analytics,
  blog, or third-party scripts.

## Constraints

- Starlight (Astro) build step outputs `dist/`. This is a new build step for
  `site/`, which is currently static with no build step (`site/README.md`
  documents this).
- The Helm repo files live on the `gh-pages` branch and are copied into the
  deploy artifact by `.github/workflows/pages.yml`. The new build must keep
  merging them into the artifact root.
- Custom domain `ryni.secanis.ch` is set at the repo level (GitHub Settings →
  Pages); `site/CNAME` is a fallback carried in the artifact.
- The landing install snippet currently carries a `@@CHART_VERSION@@`
  placeholder substituted by `pages.yml`. The new build must preserve a way to
  show the current chart version.
- Design-language tokens are specified for the app's Tailwind setup; the site
  is a separate Starlight project, so the tokens must be ported to Starlight's
  CSS custom properties, not reused directly.

## Approaches considered

1. **Static hand-written multi-page HTML** (rejected) — no build step, but
   shared nav/footer copy-pasted across pages, no search, and the user
   explicitly prefers Starlight.
2. **VitePress** (rejected) — user prefers Starlight.
3. **Starlight** (chosen) — Astro docs theme: markdown/MDX content, sidebar +
   search built in, themable via CSS custom properties (good fit for porting
   the design language). Cost: adds a build step, which we contain in
   `pages.yml`.

## Decisions taken with the human partner

- **Starlight** over VitePress/static HTML.
- **Same design language** as the dashboard app (aurora identity, Sora/Inter/
  JetBrains Mono).
- **Landing page + separate docs pages** (not a single all-in-one page).
- **Hybrid README split** — README keeps the getting-started essentials, the
  site owns the full operator docs (see "Source of truth" below).

## Design

### Repository layout

The Starlight project lives in `site/`, replacing the current static files:

```
site/
├── astro.config.mjs         # starlight() config, sidebar, custom CSS
├── package.json
├── src/
│   ├── content/docs/        # docs pages (.md/.mdx) — the /docs/ section
│   ├── pages/index.astro    # custom landing page
│   ├── styles/custom.css    # design-language token port
│   └── assets/fonts/        # vendored Sora / Inter / JetBrains Mono
├── public/
│   ├── CNAME                # ryni.secanis.ch (fallback; moves from site/CNAME)
│   └── favicon.ico / og image
└── README.md                # updated maintainer notes (build + Helm root)
```

`site/index.html` is removed (replaced by the Starlight landing).

### Page tree

**Landing (`/`)** — custom `src/pages/index.astro`, not a docs page:
- Hero: "RÝNI" wordmark with aurora accent dot, tagline ("Self-hosted,
  privacy-preserving web analytics — no cookies, no fingerprinting, respects
  Do Not Track").
- Feature highlights (per-site dashboards, Variant A/B tracking, roles + SSO,
  backups, no cookies / DNT).
- Quick install: docker compose snippet + both tracking snippets (Variant A
  and B), with the chart version where relevant.
- Links: GitHub, Helm repo, Docker Hub, Artifact Hub, and a prominent
  "Read the docs" CTA.

**Docs (`/docs/`)** — Starlight content collection, sidebar-ordered:
1. `index` — overview: what Rýni is, key features, how it compares to
   Ackee/STJÓRNA, the two tracking variants.
2. `quickstart` — docker compose install (from README "Quick start").
3. `tracking` — Variant A + B, allowed origins, SPA route changes
   (`data-ryni-detailed`), and the Variant B proxy config (from
   `docs/variant-b-proxy.md`: nginx + framework examples, Sec-Fetch-Site note).
4. `configuration` — environment variables table (from README).
5. `helm` — Helm install + values + data-safety notes (from
   `helm/ryni/README.md`).
6. `sso-and-backups` — OIDC/SSO, scheduled + manual backups.
7. `development` — frontend/backend dev, project structure, CI/CD notes.

### Design-language port (Starlight)

Starlight themes via CSS custom properties; we override them in
`src/styles/custom.css` to match the app tokens.

- **Accent** — aurora green. `--sl-color-accent` (and its high/low shades) →
  `accent` (`#4EE6A8` dark / `#0BA477` light). `--sl-color-text-accent` set for
  readable links. Buttons and focus states follow Starlight's accent roles.
- **Base/surface/text** — map the `bg` / `surface` / `surface-2` / `border` /
  `text` / `muted` tokens onto Starlight's `--sl-color-bg`, `--sl-color-text`,
  `--sl-color-gray-*`, sidebar and inline-code surfaces. Dark = Polar Night,
  light = Glacier.
- **Fonts** — self-hosted, vendored in `src/assets/fonts/`, loaded via
  `@font-face` (no Google Fonts). `--sl-font` → Inter; `--sl-font-mono` →
  JetBrains Mono; headings (and the wordmark) → Sora via a heading override.
- **Dark default** — the app defaults to dark; set Starlight's default theme to
  dark (Polar Night), light (Glacier) selectable via Starlight's theme toggle.
- **Aurora signature, restrained** — the wordmark accent dot, a hero gradient,
  and primary-button/accents. No gradients as page chrome (consistent with the
  design language's anti-goal).

### Search

Enable Starlight's built-in Pagefind search. It is static, bundled at build
time, and runs client-side — no external requests, so it fits the privacy
positioning and gives docs real findability.

### Chart version in the landing snippet

Replace the `@@CHART_VERSION@@` text-substitution with a build-time value:
`pages.yml` passes the latest chart version as an env var into the Astro build
(e.g. `PUBLIC_CHART_VERSION`), and the landing page renders it into the Helm
install snippet. Fallback stays the same as today (read `helm/ryni/Chart.yaml`
before the first release).

### CI/CD changes (`.github/workflows/pages.yml`)

1. Checkout the repo.
2. Setup Node, `npm ci` in `site/`.
3. Build Starlight with `PUBLIC_CHART_VERSION` set → `site/dist`.
4. Fetch the Helm repo files (`index.yaml`, `*.tgz`, `artifacthub-repo.yaml`)
   from the `gh-pages` branch and copy them into the `dist/` root (same merge
   as today, so a redeploy never drops the Helm repo).
5. Deploy `dist/` via `actions/deploy-pages`.

Triggers stay: push to `main` (paths under `site/`), `workflow_dispatch`, and
`workflow_call` from `release.yml`. `release.yml` keeps invoking it after a
release (still passing the chart version). The `site/README.md` maintainer
notes are updated to describe the build step.

## Source of truth (decided)

Hybrid split — README stays as the getting-started on-ramp, the site is the
full operator reference:

- **README.md keeps**: tagline, docker compose quickstart, both tracking
  snippets (brief), the features list, license, and a link to the site docs.
- **README.md drops / site owns**: environment-variables table, Helm
  install/values, SSO/backups, development/project-structure, Variant B proxy
  details (nginx + framework examples).
- **`docs/variant-b-proxy.md`** is folded into `/docs/tracking/` and the file
  removed.
- **`helm/ryni/README.md`** stays full (Helm chart README convention) and is
  synced with `/docs/helm/`.

Canonical Helm repo URL is `https://ryni.secanis.ch/` everywhere. The stale
`https://secanis.github.io/ryni/` in `README.md` and `helm/ryni/README.md` is
fixed to the custom domain as part of the migration.

## What's left to the builder

- Exact Starlight/Astro versions and config wiring (`astro.config.mjs`,
  sidebar order, `custom.css` token mapping).
- Precise CSS custom-property mapping to achieve the Polar Night / Glacier
  themes (the semantic tokens above are the source of truth; the mapping is
  mechanical).
- Landing page layout and copy details (headings, feature bullets), within the
  design language.
- Vendoring the three font families and writing the `@font-face` rules.
- The `pages.yml` rewrite and the `PUBLIC_CHART_VERSION` plumbing.
- Updating `site/README.md` and `README.md` (per the source-of-truth decision).

## Risks

- **Helm repo regression** — the merge of `gh-pages` files into `dist/` must be
  kept exactly; otherwise a landing redeploy drops `index.yaml`. Covered by a
  deploy check.
- **Build step failure** — a broken `pages.yml` now breaks the public site and
  the Helm repo together. Mitigate by keeping the deploy conservative and
  testing on a PR before merge.
- **Design-language fidelity** — porting Tailwind-semantic tokens to Starlight's
  CSS variables is mechanical but easy to get subtly wrong; review against the
  design-language spec.

## Settled by the builder (calls to check while reading)

- **Fonts vendored independently** — the site vendors its own copies
  (`src/assets/fonts/`, woff2): Inter 400/500/600, Sora 600/700, JetBrains
  Mono 500/600/700 (the weights from the design-language table). The app
  doesn't ship font files yet; that's out of scope here, and the site's
  copies become the de-facto brand font source.
- **Landing shell** — the landing page (`src/pages/index.astro`) uses a
  lightweight standalone shell (wordmark + "Docs" + GitHub link + theme
  toggle), not Starlight's full docs chrome (no sidebar/search on the landing;
  search lives in `/docs/`).
- **CI trigger widened** — `pages.yml` also rebuilds on changes to
  `helm/ryni/README.md`, so edits to the chart README re-sync `/docs/helm/`.
- **Dark default** — Starlight defaults to dark (Polar Night); light (Glacier)
  selectable, with the small init script Starlight needs to honor a dark
  default.
