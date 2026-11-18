import { createSignal, For, onMount, Show } from 'solid-js';
import { RotateCcw, TriangleAlert, Upload } from 'lucide-solid';
import {
  listBackups,
  restoreBackup,
  sizeLabel,
  uploadBackup,
  type BackupInfo,
} from '~/utils/backup';

// Restore panel (superuser only — gated by the parent Settings page).
// Restores a previous backup or a freshly uploaded .zip archive. Restoring is
// destructive: it replaces the live database and uploaded files.

export default function RestorePanel() {
  const [backups, setBackups] = createSignal<BackupInfo[]>([]);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [file, setFile] = createSignal<File | null>(null);
  let fileInput: HTMLInputElement | undefined;

  async function load() {
    setBackups(await listBackups());
  }

  onMount(() => {
    void load();
  });

  function confirmRestore(label: string): boolean {
    return window.confirm(
      `Restore "${label}"?\n\nThis replaces the current database and uploaded files with the backup contents. This cannot be undone.`,
    );
  }

  async function restore(key: string) {
    if (!confirmRestore(key)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await restoreBackup(key);
      setMessage(`Restored ${key}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  }

  async function uploadAndRestore() {
    const f = file();
    if (!f || !confirmRestore(f.name)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await uploadBackup(f);
      await restoreBackup(f.name);
      setMessage(`Restored ${f.name}.`);
      setFile(null);
      if (fileInput) fileInput.value = '';
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="space-y-4">
      <h2 class="text-lg font-medium">Restore</h2>

      <div class="flex items-start gap-2 rounded-radius-sm border border-border bg-surface-2 p-3 text-xs text-muted">
        <TriangleAlert size={15} class="mt-0.5 shrink-0 text-warn" />
        <p>
          Restoring replaces the current database and uploaded files with the backup's
          contents. Create a fresh backup first. After restoring you may need to reload and
          sign in again.
        </p>
      </div>

      {error() && <p class="text-danger text-sm">{error()}</p>}
      <Show when={message()}>
        <p class="flex items-center gap-2 text-sm text-accent">
          {message()}
          <button type="button" onClick={() => window.location.reload()} class="underline">
            Reload now
          </button>
        </p>
      </Show>

      <Show
        when={backups().length > 0}
        fallback={<p class="text-muted">No backups to restore.</p>}
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
                <button
                  type="button"
                  onClick={() => void restore(b.key)}
                  disabled={busy()}
                  class="inline-flex items-center gap-1.5 rounded-radius-sm border border-border px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  Restore
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <div class="space-y-2 border-t border-border pt-4">
        <h3 class="text-sm font-medium">Restore from a file</h3>
        <p class="text-xs text-muted">Upload a backup archive (.zip) and restore it.</p>
        <div class="flex flex-wrap items-center gap-2">
          <input
            ref={(el) => {
              fileInput = el;
            }}
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
            class="text-sm text-muted file:mr-3 file:rounded-radius-sm file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
          />
          <button
            type="button"
            onClick={() => void uploadAndRestore()}
            disabled={busy() || !file()}
            class="inline-flex items-center gap-1.5 rounded-radius-sm bg-accent px-4 py-2 text-sm text-accent-fg disabled:opacity-50"
          >
            <Upload size={14} />
            Upload &amp; restore
          </button>
        </div>
      </div>
    </div>
  );
}
