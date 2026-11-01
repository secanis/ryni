import { createSignal, untrack } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { sitesStore } from '~/stores/sites';
import Snippet from '~/components/sites/Snippet';
import CopyButton from '~/components/ui/CopyButton';
import type { Site } from '~/types';

// Edit dialog for an existing site: rename, change the allowed origins
// (the tracked site's URL(s) for Variant A), and review the integration
// snippets again. Also offers site deletion.
export default function SiteSettingsDialog(props: {
  site: Site;
  onClose: () => void;
  onSaved?: (site: Site) => void;
}) {
  const navigate = useNavigate();
  // The dialog is freshly mounted per site (see the <Show> gate in the
  // dashboard), so the props are read once, non-reactively, as initial values.
  const [name, setName] = createSignal(untrack(() => props.site.name));
  const [origins, setOrigins] = createSignal(
    untrack(() => (props.site.allowed_origins || []).join(', ')),
  );
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');

  const server = () => window.location.origin;
  const field = 'w-full border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700';

  async function save() {
    setBusy(true);
    setError('');
    try {
      const updated = await sitesStore.update(props.site.id, {
        name: name(),
        allowed_origins: origins()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      props.onSaved?.(updated);
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete site "${props.site.name}"? This cannot be undone.`)) return;
    setBusy(true);
    setError('');
    try {
      await sitesStore.remove(props.site.id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setBusy(false);
    }
  }

  return (
    <div
      class="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto p-4"
      onClick={() => props.onClose()}
    >
      <div
        class="bg-white dark:bg-slate-900 rounded-lg shadow p-6 w-full max-w-2xl space-y-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-lg">Site settings</h2>
          <button
            onClick={() => props.onClose()}
            aria-label="Close"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label for="site-name" class="block text-sm mb-1">
              Name
            </label>
            <input
              id="site-name"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              class={field}
            />
          </div>
          <div>
            <label for="site-origins" class="block text-sm mb-1">
              Site URL(s) — allowed origins (Variant A, comma-separated)
            </label>
            <input
              id="site-origins"
              value={origins()}
              onInput={(e) => setOrigins(e.currentTarget.value)}
              placeholder="https://mysite.example"
              class={field}
            />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm mb-1">Tracking id</label>
              <div class="flex items-center gap-2">
                <code class="font-mono text-sm">{props.site.tracking_id}</code>
                <CopyButton text={props.site.tracking_id} />
              </div>
            </div>
            <div>
              <label class="block text-sm mb-1">Tracking endpoint</label>
              <code class="font-mono text-sm break-all">/t/{props.site.endpoint_slug}</code>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-200 dark:border-slate-800 pt-4">
          <h3 class="font-medium mb-3">Tracking code</h3>
          <Snippet input={{ server: server(), site: props.site.tracking_id, detailed: false }} />
        </div>

        {error() && <p class="text-red-500 text-sm">{error()}</p>}

        <div class="flex items-center justify-between pt-2">
          <button onClick={() => void remove()} class="text-sm text-red-600 underline">
            Delete site
          </button>
          <div class="flex gap-2">
            <button
              onClick={() => props.onClose()}
              class="px-4 py-2 rounded border border-slate-300 dark:border-slate-700 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={busy()}
              class="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy() ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
