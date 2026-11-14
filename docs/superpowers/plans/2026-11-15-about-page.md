# About Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authenticated `/about` page to the RÝNI frontend that shows project links, the running build's version/commit/build time, the curated OSS stack and a privacy/licence footer.

**Architecture:** Build metadata is resolved at bundle time in `vite.config.ts` (env → git → package.json) and injected with Vite `define` as `__APP_VERSION__`, `__APP_COMMIT__`, `__BUILD_TIME__`. A small `src/utils/version.ts` module formats that data and holds the fallback logic (unit-tested). The page is a lazy route under the existing `RequireAuth` shell, linked from the header nav.

**Tech Stack:** SolidJS, @solidjs/router, Tailwind CSS, lucide-solid, Vite 8, Vitest, Docker (node:24-alpine + nginx-unprivileged).

**Spec:** `docs/superpowers/specs/2026-11-15-about-page-design.md`

## Global Constraints

- English only — no i18n layer.
- No new runtime dependencies.
- Page lives behind `RequireAuth` (same auth boundary as every other page).
- Tailwind slate palette, matching `frontend/src/pages/Settings.tsx` (`text-slate-*`, `dark:*`, `border-slate-200 dark:border-slate-800`).
- Version resolution order: `RYNI_VERSION` → `git describe --tags --always --dirty` → `package.json` version.
- Commit resolution order: `RYNI_COMMIT` → `git rev-parse --short HEAD` → `local`.
- Project licence is AGPL-3.0-or-later.
- `frontend/` is the Vite root; the Docker build context is `frontend/`, so no `.git` is available inside the image.

## Review Focus

1. Image built with no `RYNI_VERSION` and no `.git` (the published-image path) — version must fall back to `package.json`'s version (`0.1.0`), never empty or a crash.
2. Commit value `local` / `unknown` — must not produce a GitHub commit link.
3. Full 40-char commit SHA — must display shortened (7 chars) with a working link.
4. Empty `RYNI_VERSION=""` — must fall through to git, not display an empty version.
5. Missing or malformed `buildTime` — must render gracefully (empty or raw string), never "Invalid Date".

---

### Task 1: Build-info helpers

**Files:**
- Create: `frontend/src/utils/version.ts`
- Test: `frontend/src/utils/version.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type BuildInfo = { version: string; commit: string; buildTime: string }`
  - `pickVersion(envVersion: string | undefined, described: string, pkgVersion: string): string`
  - `pickCommit(envCommit: string | undefined, gitSha: string): string`
  - `shortCommit(commit: string): string`
  - `commitUrl(commit: string): string | null`
  - `formatBuildTime(iso: string): string`
  - `buildInfo(): BuildInfo`

- [ ] **Step 1: Write the failing test**

`frontend/src/utils/version.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickVersion, pickCommit, shortCommit, commitUrl, formatBuildTime } from './version';

describe('pickVersion', () => {
  it('prefers RYNI_VERSION', () => {
    expect(pickVersion('v0.1.0', 'v0.0.9-3-gabc', '0.1.0')).toBe('v0.1.0');
  });
  it('falls through an empty RYNI_VERSION to git describe', () => {
    expect(pickVersion('', 'v0.0.9-3-gabc', '0.1.0')).toBe('v0.0.9-3-gabc');
  });
  it('falls back to the package version when git has nothing', () => {
    expect(pickVersion(undefined, '', '0.1.0')).toBe('0.1.0');
  });
  it('returns dev when everything is empty', () => {
    expect(pickVersion('', '', '')).toBe('dev');
  });
});

describe('pickCommit', () => {
  it('prefers RYNI_COMMIT', () => {
    expect(pickCommit('abc1234', 'def5678')).toBe('abc1234');
  });
  it('falls back to the local sha', () => {
    expect(pickCommit(undefined, 'def5678')).toBe('def5678');
  });
  it('returns local when both are empty', () => {
    expect(pickCommit('', '')).toBe('local');
  });
});

describe('shortCommit', () => {
  it('shortens a full sha to 7 characters', () => {
    expect(shortCommit('0123456789abcdef0123456789abcdef01234567')).toBe('0123456');
  });
  it('leaves non-sha values untouched', () => {
    expect(shortCommit('local')).toBe('local');
  });
});

describe('commitUrl', () => {
  it('links a 7-40 char hex sha', () => {
    expect(commitUrl('0123456')).toBe('https://github.com/secanis/ryni/commit/0123456');
  });
  it('returns null for non-sha values', () => {
    expect(commitUrl('local')).toBeNull();
    expect(commitUrl('unknown')).toBeNull();
  });
});

describe('formatBuildTime', () => {
  it('formats an ISO timestamp', () => {
    expect(formatBuildTime('2026-11-15T10:20:30.000Z')).not.toBe('');
    expect(formatBuildTime('2026-11-15T10:20:30.000Z')).not.toBe('Invalid Date');
  });
  it('returns an empty string for empty or invalid input', () => {
    expect(formatBuildTime('')).toBe('');
    expect(formatBuildTime('not-a-date')).toBe('not-a-date');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/version.test.ts`
Expected: FAIL — cannot resolve `./version`.

- [ ] **Step 3: Implement `frontend/src/utils/version.ts`**

`formatBuildTime` returns `''` for an empty input, the raw input when `Date.parse` is `NaN`, otherwise `new Date(iso).toLocaleString()`. `commitUrl` matches `/^[0-9a-f]{7,40}$/i` before building the GitHub URL with the full value. `buildInfo()` reads the injected globals defensively:

```ts
export function buildInfo(): BuildInfo {
  return {
    version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
    commit: typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'local',
    buildTime: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '',
  };
}
```

Also export `const REPOSITORY = 'https://github.com/secanis/ryni';` for the page.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/version.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/version.ts frontend/src/utils/version.test.ts
git commit -m "feat(about): add build-info helpers"
```

---

### Task 2: Stamp build metadata into the bundle and image

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/vite-env.d.ts`
- Modify: `frontend/Dockerfile`
- Modify: `.github/workflows/release.yml:163-168`
- Modify: `pocketbase/Dockerfile` (declare the new build arg so buildx does not warn)

**Interfaces:**
- Consumes: `pickVersion`, `pickCommit` from Task 1.
- Produces: global constants `__APP_VERSION__: string`, `__APP_COMMIT__: string`, `__BUILD_TIME__: string` available in every frontend module and in the built bundle.

- [ ] **Step 1: Wire the values in `frontend/vite.config.ts`**

Import `execFileSync`, `readFileSync` and Task 1's `pickVersion` / `pickCommit`. Add helpers:

```ts
function git(args: string[], fallback: string): string {
  try {
    return execFileSync('git', args, { cwd: import.meta.dirname, encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}
```

Resolve before `defineConfig`:

```ts
const pkg = JSON.parse(readFileSync(path.resolve(import.meta.dirname, './package.json'), 'utf8'));
const version = pickVersion(process.env.RYNI_VERSION, git(['describe', '--tags', '--always', '--dirty'], ''), pkg.version || '');
const commit = pickCommit(process.env.RYNI_COMMIT, git(['rev-parse', '--short', 'HEAD'], ''));
const buildTime = new Date().toISOString();
```

and add to the exported config:

```ts
define: {
  __APP_VERSION__: JSON.stringify(version),
  __APP_COMMIT__: JSON.stringify(commit),
  __BUILD_TIME__: JSON.stringify(buildTime),
},
```

- [ ] **Step 2: Declare the globals in `frontend/src/vite-env.d.ts`**

Append:

```ts
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __BUILD_TIME__: string;
```

- [ ] **Step 3: Verify the bundle is stamped**

Run: `cd frontend && RYNI_VERSION=v9.9.9-test npm run build && grep -rl "v9.9.9-test" dist/assets`
Expected: at least one file path printed (the About chunk).

Run: `cd frontend && npm run typecheck`
Expected: clean.

- [ ] **Step 4: Accept the args in `frontend/Dockerfile`**

In the builder stage, before `WORKDIR /app`:

```dockerfile
# Build metadata stamped into the bundle (see vite.config.ts). The Docker
# context is frontend/, so there is no .git for the git-describe fallback;
# release.yml always passes RYNI_VERSION and RYNI_COMMIT.
ARG RYNI_VERSION=dev
ARG RYNI_COMMIT=local
```

- [ ] **Step 5: Pass the commit from the release workflow**

In `.github/workflows/release.yml`, extend the existing `build-args` block:

```yaml
          build-args: |
            RYNI_VERSION=${{ needs.resolve.outputs.tag }}
            RYNI_COMMIT=${{ github.sha }}
```

Add `ARG RYNI_COMMIT=local` next to `ARG RYNI_VERSION` in `pocketbase/Dockerfile` (it is unused there, but keeps the shared matrix build-args warning-free).

- [ ] **Step 6: Verify the image carries the stamp**

Run: `docker build -q -t ryni-frontend:about-test --build-arg RYNI_VERSION=v9.9.9-test --build-arg RYNI_COMMIT=0123456789abcdef0123456789abcdef01234567 frontend`
Expected: image builds.

Run: `docker run --rm ryni-frontend:about-test sh -c 'grep -rl "v9.9.9-test" /usr/share/nginx/html/assets'`
Expected: one file path printed.

- [ ] **Step 7: Commit**

```bash
git add frontend/vite.config.ts frontend/src/vite-env.d.ts frontend/Dockerfile pocketbase/Dockerfile .github/workflows/release.yml
git commit -m "feat(about): stamp version, commit and build time into the bundle"
```

---

### Task 3: About page, route and nav link

**Files:**
- Create: `frontend/src/pages/About.tsx`
- Modify: `frontend/src/App.tsx` (lazy import + route inside `RequireAuth`)
- Modify: `frontend/src/components/layout/Shell.tsx` (nav link)

**Interfaces:**
- Consumes: `buildInfo`, `shortCommit`, `commitUrl`, `formatBuildTime`, `REPOSITORY` from Task 1; the `auth` store (`~/stores/auth`).
- Produces: default-exported `About` Solid component rendered at `/about`.

- [ ] **Step 1: Create `frontend/src/pages/About.tsx`**

Layout mirrors `Settings.tsx` (`<div class="space-y-6 max-w-3xl">`, `h1` at `text-2xl font-semibold`, cards `rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5`). Blocks, in order:

1. Header: `Info` icon (lucide-solid, size 24), `<h1>About RÝNI</h1>`, subtitle `Privacy-preserving web analytics`.
2. `Show when={auth.isAuthenticated()}`: `Signed in as {auth.user()?.email ?? 'unknown user'}`.
3. **Project links** card, heading `Project`, four rows (`target="_blank" rel="noopener noreferrer"`, trailing `↗`):
   - Source code → `https://github.com/secanis/ryni`
   - Website → `https://ryni.secanis.ch`
   - Helm chart → `https://artifacthub.io/packages/helm/ryni/ryni`
   - Container images → `https://hub.docker.com/r/secanis/ryni-frontend`
4. **Build info** card, heading `Build`:
   - Version → `info().version`
   - Commit → `<Show when={commitUrl(info().commit)} fallback={shortCommit(info().commit)}>` link to the URL with text `shortCommit(info().commit)`
   - Built → `formatBuildTime(info().buildTime)` with the raw value as fallback text when formatting returns `''`
   Read once: `const info = buildInfo();` at component top (values are compile-time constants).
5. **OSS stack** card, heading `Built on` + hint `The stack RÝNI is assembled from.` — a `<For>` over this exact list, each row: role label (uppercase, `text-xs`, `w-24`), name link, description, licence (`font-mono text-xs`):

```ts
const DEPENDENCIES = [
  { name: 'PocketBase', description: 'Single-binary Go backend (auth, storage, admin UI)', license: 'MIT', url: 'https://pocketbase.io', role: 'Backend' },
  { name: 'SolidJS', description: 'Reactive UI framework with fine-grained reactivity', license: 'MIT', url: 'https://www.solidjs.com', role: 'Frontend' },
  { name: 'Solid Router', description: 'Routing for SolidJS single-page apps', license: 'MIT', url: 'https://github.com/solidjs/solid-router', role: 'Frontend' },
  { name: '@ark-ui/solid', description: 'Accessible, unstyled UI primitives', license: 'MIT', url: 'https://ark-ui.com', role: 'Frontend' },
  { name: 'lucide-solid', description: 'Icon set (SolidJS bindings)', license: 'ISC', url: 'https://lucide.dev', role: 'Frontend' },
  { name: 'Tailwind CSS', description: 'Utility-first CSS framework', license: 'MIT', url: 'https://tailwindcss.com', role: 'Styling' },
  { name: 'TypeScript', description: 'Static type checker (source is .tsx)', license: 'Apache-2.0', url: 'https://www.typescriptlang.org', role: 'Tooling' },
  { name: 'Vite', description: 'Frontend build tool and dev server', license: 'MIT', url: 'https://vite.dev', role: 'Tooling' },
  { name: 'Vitest', description: 'Unit-test runner (Vite-native)', license: 'MIT', url: 'https://vitest.dev', role: 'Tooling' },
  { name: 'Helm', description: 'Kubernetes chart packaging', license: 'Apache-2.0', url: 'https://helm.sh', role: 'Deployment' },
  { name: 'nginx', description: 'Static file server for the SPA', license: 'BSD-2-Clause', url: 'https://nginx.org', role: 'Deployment' },
] as const;
```

6. Footer (`text-xs text-slate-400 text-center`): `RÝNI sets no cookies, honours Do Not Track and stores no IP addresses. Licensed under AGPL-3.0-or-later.`

All long values (version, commit) use `break-all font-mono` so a 40-char SHA does not overflow.

- [ ] **Step 2: Add the route**

In `frontend/src/App.tsx`: `const About = lazy(() => import('~/pages/About'));` next to the other lazy imports, and inside the `RequireAuth` route block: `<Route path="/about" component={About} />`.

- [ ] **Step 3: Add the nav link**

In `frontend/src/components/layout/Shell.tsx`, inside the authenticated nav (`Show when={auth.isAuthenticated()}`), after the `Dashboard` link:

```tsx
<A href="/about" class="hover:underline">
  About
</A>
```

- [ ] **Step 4: Verify typecheck, lint and unit tests**

Run: `cd frontend && npm run typecheck && npm run lint && npx vitest run`
Expected: all clean/passing (13 version tests + existing 34).

- [ ] **Step 5: Verify the built page end to end**

Run: `cd frontend && RYNI_VERSION=v9.9.9-test npm run build`
Run: `docker build -q -t ryni-frontend:about-test --build-arg RYNI_VERSION=v9.9.9-test --build-arg RYNI_COMMIT=0123456789abcdef0123456789abcdef01234567 frontend`
Run: `docker run -d --name ryni-about-test --add-host pocketbase:127.0.0.1 -p 18081:8080 ryni-frontend:about-test`
Expected: container starts; `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18081/about` → `200` (SPA fallback); `docker run --rm ryni-frontend:about-test sh -c 'grep -rl "v9.9.9-test" /usr/share/nginx/html/assets'` prints a file; `docker run --rm ryni-frontend:about-test sh -c 'grep -rl "About RÝNI" /usr/share/nginx/html/assets'` prints a file.
Clean up: `docker rm -f ryni-about-test`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/About.tsx frontend/src/App.tsx frontend/src/components/layout/Shell.tsx
git commit -m "feat(about): add About page with build info and OSS stack"
```
