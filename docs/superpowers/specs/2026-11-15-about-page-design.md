# About page — design

Date: 2026-11-15
Status: awaiting approval

## Intent

Give RÝNI an `/about` page modelled on STJÓRNA's: project links, build
information, the OSS stack it is built on, and a short privacy footer. RÝNI
operators should be able to see which version they are running without
inspecting the image, and the page doubles as attribution for the AGPL
project.

## Goals

- `/about` behind login (same auth boundary as every other RÝNI page).
- Show version, commit and build time of the running frontend image.
- Link to the GitHub project, the public site, the Helm repo and the
  container images.
- Curated list of the main dependencies with licences.
- One nav entry, visible to every signed-in user.

## Non-goals

- No i18n (RYNI is English-only today).
- No public (unauthenticated) about page.
- No backend/API version endpoint; the PocketBase `RYNI_VERSION` env var is
  not surfaced.
- No dependency auto-discovery from `package.json`.

## Decisions taken with the human partner

- Full parity with STJÓRNA's page, including the build-info block (option 1).
- Build metadata is injected at **build time** rather than fetched from a
  generated `public/version.json`:
  - `vite.config.ts` exposes `__APP_VERSION__`, `__APP_COMMIT__`,
    `__BUILD_TIME__` via Vite `define`.
  - Resolution order for the version: `RYNI_VERSION` env → `git describe
    --tags --always --dirty` → `package.json` version.
  - Commit: `RYNI_COMMIT` env → `git rev-parse --short HEAD` → `local`.
  - Rationale: no extra HTTP request, no 404 path, no generated file that
    dirties the working tree after a build. The data is fixed per image,
    so baking it into the bundle is the honest representation.
- Docker: `frontend/Dockerfile` gains `ARG RYNI_VERSION=dev` and
  `ARG RYNI_COMMIT=local` (its build context is `frontend/`, so there is no
  `.git` to derive them from inside the image). `release.yml` already passes
  `RYNI_VERSION`; it gains `RYNI_COMMIT=${{ github.sha }}` for the same
  build-args block (`actions/checkout` is on the release tag, so this is the
  released commit).
- Nav placement: the header in `Shell.tsx` gains an `About` link next to
  `Dashboard` (visible to all authenticated users). `Users` / `Settings`
  stay superuser-only.

## Page content

1. Header: icon, title "About RÝNI", tagline "Privacy-preserving web
   analytics".
2. Signed-in-as line when authenticated (reuse `auth` store).
3. Project links: source (`github.com/secanis/ryni`), website
   (`ryni.secanis.ch`), Helm chart (`artifacthub.io/packages/helm/ryni/ryni`),
   container images (`hub.docker.com/r/secanis/ryni-frontend`).
4. Build info: version, commit (linked to
   `github.com/secanis/ryni/commit/<sha>` when it is a real SHA), build time
   formatted in the browser's locale.
5. OSS stack: curated list (PocketBase, SolidJS, Solid Router, @ark-ui/solid,
   lucide-solid, Tailwind CSS, TypeScript, Vite, Vitest, Helm, nginx) with
   description, licence and a role label.
6. Footer: short note that RÝNI sets no cookies, honours Do Not Track and
   logs no IPs, plus the AGPL-3.0 licence.

## Implementation sketch

- `frontend/src/pages/About.tsx` — lazy-loaded route in `App.tsx` under
  `RequireAuth`; Tailwind slate palette matching `Settings.tsx`.
- `frontend/src/utils/version.ts` — tiny helpers to read the injected
  constants and format commit/build time (unit-tested).
- `frontend/vite.config.ts` — resolve the three values and pass them to
  `define`.
- `frontend/src/vite-env.d.ts` — declare the globals for TypeScript.
- `frontend/Dockerfile`, `.github/workflows/release.yml` — build args.
- No new runtime dependency.

## Risks

- `vite build` in CI (no `RYNI_VERSION` env) falls back to `git describe`,
  which yields `v<tag>-<n>-g<sha>` or the short SHA — accurate and readable.
- The commit link must not be rendered for non-SHA values (`local`,
  `unknown`); covered by a helper + test.
- Build args do not affect runtime config (`/config.js` path untouched).
