import { createSignal, For, onMount, Show } from 'solid-js';
import { pb } from '~/services/pocketbase';
import { backupName } from '~/utils/backupName';

interface BackupInfo {
  key: string;
  size: number;
  modified: string;
}

// Backup management panel (superuser only — gated by the parent Settings
// page). Lists, creates, downloads and deletes system backups.

export default function BackupPanel() {
  const [backups, setBackups] = createSignal<BackupInfo[]>([]);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');

  async function load() {
    const res = await pb.send('/api/backups', { method: 'GET' });
    setBackups(res as unknown as BackupInfo[]);
  }

  onMount(() => {
    void load();
  });

  async function create() {
    setBusy(true);
    setError('');
    try {
      await pb.send('/api/backups', {
        method: 'POST',
        body: { name: backupName() },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(key: string) {
    await pb.send(`/api/backups/${encodeURIComponent(key)}`, { method: 'DELETE' });
    await load();
  }

  async function download(key: string) {
    setError('');
    try {
      // Fetch the backup with the token in the Authorization header — never
      // the query string, which would leak into logs/browser history/Referer.
      const res = await fetch(`${pb.baseUrl}/api/backups/${encodeURIComponent(key)}`, {
        headers: { Authorization: pb.authStore.token },
      });
      if (!res.ok) {
        throw new Error(`Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = key;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }

  function sizeLabel(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium">Backups</h2>
        <button
          onClick={() => void create()}
          disabled={busy()}
          class="bg-accent text-accent-fg rounded-radius-sm px-4 py-2 disabled:opacity-50"
        >
          {busy() ? 'Creating…' : 'Create backup'}
        </button>
      </div>

      {error() && <p class="text-danger text-sm">{error()}</p>}
      <Show
        when={backups().length > 0}
        fallback={<p class="text-muted">No backups yet.</p>}
      >
        <ul class="bg-surface rounded-radius-card border border-border divide-y divide-border">
          <For each={backups()}>
            {(b) => (
              <li class="flex items-center justify-between p-3">
                <div>
                  <div class="text-sm font-mono">{b.key}</div>
                  <div class="text-xs text-muted">
                    {sizeLabel(b.size)} · {b.modified}
                  </div>
                </div>
                <div class="flex gap-3">
                  <button onClick={() => void download(b.key)} class="text-sm underline">
                    Download
                  </button>
                  <button onClick={() => void remove(b.key)} class="text-sm underline text-danger">
                    Delete
                  </button>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
