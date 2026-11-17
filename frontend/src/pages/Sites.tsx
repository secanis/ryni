import { For, Show, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { sitesStore } from '~/stores/sites';
import SiteCard from '~/components/sites/SiteCard';

export default function Sites() {
  const navigate = useNavigate();
  onMount(() => {
    void sitesStore.load();
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold">Sites</h1>
        <button
          onClick={() => navigate('/sites/new')}
          class="bg-accent text-accent-fg rounded-radius-sm px-4 py-2"
        >
          Add site
        </button>
      </div>

      <Show when={!sitesStore.loading()} fallback={<p class="text-muted">Loading…</p>}>
        <Show
          when={sitesStore.sites().length > 0}
          fallback={<p class="text-muted">No sites yet. Add one to get started.</p>}
        >
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <For each={sitesStore.sites()}>{(site) => <SiteCard site={site} />}</For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
