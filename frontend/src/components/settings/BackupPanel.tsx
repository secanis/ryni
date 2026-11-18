import { createSignal, For, onMount, Show } from 'solid-js';
import { Download, Trash2 } from 'lucide-solid';
import { pb } from '~/services/pocketbase';
import { backupDownloadUrl } from '~/utils/backupDownloadUrl';
import { backupName } from '~/utils/backupName';
import {
  createBackup,
  deleteBackup,
  listBackups,
  sizeLabel,
  type BackupInfo,
} from '~/utils/backup';

// Backup management panel (superuser only — gated by the parent Settings
// page). Creates, lists, downloads and deletes system backups.

export default function BackupPanel() {
  const [backups, setBackups] = createSignal<BackupInfo[]>([]);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');

  async function load() {
    setBackups(await listBackups());
  }

  onMount(() => {
    void load();
  });

  async function create() {
    setBusy(true);
    setError('');
    try {
      await createBackup(backupName());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(key: string) {
    await deleteBackup(key);
    await load();
  }

  async function download(key: string) {
    setError('');
    try {
      // Fetch the backup with the token in the Authorization header — never
      // the query string, which would leak into logs/browser history/Referer.
      const res = await fetch(backupDownloadUrl(key), {
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
                <div class="flex items-center gap-4">
                  <button
                    onClick={() => void download(b.key)}
                    aria-label={`Download ${b.key}`}
                    title="Download"
                    class="text-muted hover:text-text transition-colors"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => void remove(b.key)}
                    aria-label={`Delete ${b.key}`}
                    title="Delete"
                    class="text-danger hover:opacity-70 transition-opacity"
                  >
                    <Trash2 size={16} />
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
