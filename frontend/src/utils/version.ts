// Build metadata for the About page and anywhere else that needs to say
// which build is running. The values are injected at bundle time by
// vite.config.ts (`define`), so they are constants in the shipped image.

export const REPOSITORY = 'https://github.com/secanis/ryni';

export type BuildInfo = {
  version: string;
  commit: string;
  buildTime: string;
};

const SHA_RE = /^[0-9a-f]{7,40}$/i;

// RYNI_VERSION (release build) → git describe (local build) → package.json.
export function pickVersion(
  envVersion: string | undefined,
  described: string,
  pkgVersion: string,
): string {
  return envVersion || described || pkgVersion || 'dev';
}

// RYNI_COMMIT (release build) → short local SHA → "local".
export function pickCommit(envCommit: string | undefined, gitSha: string): string {
  return envCommit || gitSha || 'local';
}

// Display form: a full 40-char SHA becomes its 7-char prefix; anything that
// is not a hex SHA ("local", "unknown") is shown untouched.
export function shortCommit(commit: string): string {
  return SHA_RE.test(commit) ? commit.slice(0, 7) : commit;
}

// GitHub link for a real SHA; null when there is nothing meaningful to link.
export function commitUrl(commit: string): string | null {
  return SHA_RE.test(commit) ? `${REPOSITORY}/commit/${commit}` : null;
}

// Empty input → "", unparseable input → the raw value, valid ISO → local
// time string. Never "Invalid Date".
export function formatBuildTime(iso: string): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString();
}

export function buildInfo(): BuildInfo {
  return {
    version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
    commit: typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'local',
    buildTime: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '',
  };
}
