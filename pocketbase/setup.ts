import PocketBase from 'pocketbase';
import * as nodeFs from 'node:fs';
import * as nodePath from 'node:path';
import { execSync } from 'node:child_process';

// 8091, not 8090: the host often runs a real STJÓRNA (or RÝNI) instance on
// 8090, and the test container uses --network=host so it would collide.
const PB_PORT = 8091;
const ADMIN_EMAIL = 'admin@test.ryni.local';
const ADMIN_PASSWORD = 'admin12345678test';
const PB_IMAGE = 'localhost/ryni-pocketbase:test';
// Path to the Dockerfile, relative to the pocketbase/ package dir.
const PB_IMAGE_CONTEXT = nodePath.resolve(process.cwd());

// Resolve the PB URL, forcing IPv4 when it points at 'localhost' (GitHub
// Actions runners resolve localhost to ::1 first, but PB binds IPv4 only).
function resolvePbUrl(envUrl: string | undefined, fallback: string): string {
  if (!envUrl) return fallback;
  try {
    const u = new URL(envUrl);
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
      return u.toString();
    }
  } catch {
    /* not parseable — leave alone */
  }
  return envUrl;
}
const PB_URL = resolvePbUrl(process.env.PB_URL, `http://127.0.0.1:${PB_PORT}`);

const CONTAINER_CLI = (() => {
  try {
    execSync('command -v docker', { stdio: 'ignore' });
    return 'docker';
  } catch {
    return 'podman';
  }
})();

let pbInstance: PocketBase | null = null;
let containerId: string | null = null;

class ContainerExitedError extends Error {}

const stateFilePath = (): string =>
  nodePath.resolve(process.cwd(), 'test-results', 'pb-state.json');

function writePbState(token: string, record: unknown): void {
  const dir = nodePath.dirname(stateFilePath());
  if (!nodeFs.existsSync(dir)) nodeFs.mkdirSync(dir, { recursive: true });
  nodeFs.writeFileSync(stateFilePath(), JSON.stringify({ token, record, pbUrl: PB_URL }));
}

function readPbState(): { token: string; record: unknown; pbUrl: string } | null {
  try {
    return JSON.parse(nodeFs.readFileSync(stateFilePath(), 'utf8'));
  } catch {
    return null;
  }
}

function clearPbState(): void {
  try {
    nodeFs.unlinkSync(stateFilePath());
  } catch {
    /* ignore */
  }
}

// Build the test image once if it isn't present, so `npm test` works on a
// fresh checkout without a separate build step.
async function ensureImage(): Promise<void> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  try {
    await execAsync(`${CONTAINER_CLI} image inspect ${PB_IMAGE}`, { encoding: 'utf8' });
  } catch {
    console.log(`[pb-test] building ${PB_IMAGE}...`);
    await execAsync(
      `${CONTAINER_CLI} build -t ${PB_IMAGE} -f Dockerfile .`,
      { encoding: 'utf8', cwd: PB_IMAGE_CONTEXT },
    );
  }
}

export async function startPocketBase(): Promise<PocketBase> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  await ensureImage();
  await cleanup();

  const alreadyUp = await fetch(`${PB_URL}/api/health`).then(() => true, () => false);
  if (alreadyUp) {
    throw new Error(
      `${PB_URL} is already serving before the test container started — stop the leftover instance and re-run.`,
    );
  }

  let stdout: string;
  try {
    const result = await execAsync(
      `${CONTAINER_CLI} run -d --network=host ` +
        `-e PB_HTTP_ADDR=0.0.0.0:${PB_PORT} ` +
        `-e PB_SUPERUSER_EMAIL=${ADMIN_EMAIL} ` +
        `-e PB_SUPERUSER_PASSWORD=${ADMIN_PASSWORD} ` +
        `${PB_IMAGE}`,
      { encoding: 'utf8' },
    );
    stdout = result.stdout;
  } catch (e: any) {
    throw new Error(
      `Failed to start ${PB_IMAGE} via ${CONTAINER_CLI}: ${e?.stderr?.toString?.() || e?.message}`,
    );
  }
  containerId = stdout.trim();
  console.log(`[pb-test] started ${CONTAINER_CLI} container ${containerId.slice(0, 12)}`);

  const containerLogs = async (): Promise<string> => {
    try {
      const { stdout: out, stderr: err } = await execAsync(
        `${CONTAINER_CLI} logs --tail 100 ${containerId}`,
        { encoding: 'utf8' },
      );
      return `${out}${err}`;
    } catch {
      return '';
    }
  };

  const assertContainerRunning = async (): Promise<void> => {
    let state = '';
    try {
      const { stdout: out } = await execAsync(
        `${CONTAINER_CLI} inspect --format '{{.State.Running}} {{.State.ExitCode}}' ${containerId}`,
        { encoding: 'utf8' },
      );
      state = out.trim();
    } catch (e: any) {
      state = `inspect failed: ${e?.stderr?.toString?.().trim() || e?.message}`;
    }
    if (state.startsWith('true')) return;
    const logs = await containerLogs();
    throw new ContainerExitedError(
      `PocketBase container exited during startup (${state}).\n` +
        (logs ? `Container logs:\n${logs}` : '(no container logs)'),
    );
  };

  const deadline = Date.now() + 300_000;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    const pb = new PocketBase(PB_URL);
    try {
      await assertContainerRunning();

      const healthRes = await fetch(`${PB_URL}/api/health`);
      if (!healthRes.ok) throw new Error(`health ${healthRes.status}`);

      const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });
      if (!authRes.ok) throw new Error(`Admin auth failed ${authRes.status}: ${await authRes.text()}`);
      const authData = await authRes.json();
      pb.authStore.save(authData.token, authData.record);

      const sites = await pb.collections.getOne('sites').catch(() => null);
      if (!sites) throw new Error('migrations incomplete: sites collection missing');

      writePbState(authData.token, authData.record);
      pbInstance = pb;
      return pbInstance;
    } catch (e) {
      if (e instanceof ContainerExitedError) throw e;
      lastError = e;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  const logs = await containerLogs();
  throw new Error(
    `Failed to start PocketBase: ${PB_URL} not healthy after 300s.\n  Last error: ${detail}\n` +
      (logs ? `Container logs:\n${logs}` : ''),
  );
}

export async function cleanup(): Promise<void> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  if (containerId) {
    try {
      await execAsync(`${CONTAINER_CLI} rm -f -v ${containerId} 2>/dev/null || true`);
    } catch {
      /* ignore */
    }
    containerId = null;
  }
  pbInstance = null;
  clearPbState();
}

export function getPb(): PocketBase {
  if (!pbInstance) {
    const state = readPbState();
    if (!state) throw new Error('PocketBase not initialized. Call startPocketBase() first.');
    pbInstance = new PocketBase(state.pbUrl);
    pbInstance.authStore.save(state.token, state.record as any);
  }
  return pbInstance;
}

export function getPbUrl(): string {
  return PB_URL;
}

export function getTestAdminCredentials(): { email: string; password: string } {
  return { email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
}
