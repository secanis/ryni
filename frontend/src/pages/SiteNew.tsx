import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { sitesStore } from '~/stores/sites';
import { generateTrackingId } from '~/utils/snippet';
import Snippet from '~/components/sites/Snippet';
import type { Site } from '~/types';

export default function SiteNew() {
  const navigate = useNavigate();
  const [name, setName] = createSignal('');
  const [trackingId] = createSignal(generateTrackingId());
  const [origins, setOrigins] = createSignal('');
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [created, setCreated] = createSignal<Site | null>(null);

  // The Rýni origin is this frontend's origin (it serves /ryni.js and proxies /t/).
  const server = () => window.location.origin;

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const site = await sitesStore.create({
        name: name(),
        tracking_id: trackingId(),
        endpoint_slug: trackingId(),
        allowed_origins: origins()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setCreated(site);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 class="text-2xl font-semibold mb-6">Add site</h1>

      <Show
        when={!created()}
        fallback={
          <Snippet
            input={{ server: server(), site: trackingId(), detailed: false }}
            onDone={() => navigate('/')}
          />
        }
      >
        <form onSubmit={onSubmit} class="space-y-4 max-w-md">
          <div>
            <label for="name" class="block text-sm mb-1">
              Name
            </label>
            <input
              id="name"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              class="w-full border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
              required
            />
          </div>
          <div>
            <label class="block text-sm mb-1">Tracking id</label>
            <input
              value={trackingId()}
              readOnly
              class="w-full border rounded px-3 py-2 font-mono bg-slate-100 dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
          <div>
            <label for="origins" class="block text-sm mb-1">
              Allowed origins (Variant A, comma-separated)
            </label>
            <input
              id="origins"
              value={origins()}
              placeholder="https://mysite.example"
              onInput={(e) => setOrigins(e.currentTarget.value)}
              class="w-full border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
          {error() && <p class="text-red-500 text-sm">{error()}</p>}
          <button
            type="submit"
            disabled={busy()}
            class="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded px-4 py-2 disabled:opacity-50"
          >
            {busy() ? 'Creating…' : 'Create site'}
          </button>
        </form>
      </Show>
    </div>
  );
}
