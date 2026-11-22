import { createSignal, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { pb } from '~/services/pocketbase';
import type { SeriesPoint, Site } from '~/types';
import CopyButton from '~/components/ui/CopyButton';
import TimeSeries from '~/components/charts/TimeSeries';
import SiteLabels from '~/components/sites/SiteLabels';
import { siteLabels } from '~/utils/labels';

interface MiniStats {
  views: number;
  uniqueVisitors: number;
  series: SeriesPoint[];
}

export default function SiteCard(props: { site: Site }) {
  const navigate = useNavigate();
  const [mini, setMini] = createSignal<MiniStats | null>(null);

  onMount(() => {
    const range = {
      from: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      to: new Date().toISOString(),
    };
    pb.send(`/api/ryni/sites/${props.site.id}/stats`, { query: range })
      .then((r) => setMini(r as unknown as MiniStats))
      .catch(() => setMini(null));
  });

  return (
    <div
      onClick={() => navigate(`/sites/${props.site.id}`)}
      class="p-4 bg-surface rounded-radius-card shadow hover:shadow-md transition border border-border cursor-pointer"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="font-medium truncate">{props.site.name}</div>
          <div class="text-sm text-muted font-mono">{props.site.tracking_id}</div>
        </div>
        <span onClick={(e) => e.stopPropagation()}>
          <CopyButton text={props.site.tracking_id} />
        </span>
      </div>

      <SiteLabels labels={siteLabels(props.site)} />

      <Show when={mini()}>
        <div class="mt-3 flex items-center justify-between gap-3">
          <div class="text-sm space-y-1 shrink-0">
            <div>
              <span class="font-semibold">{mini()!.views}</span>
              <span class="text-muted"> views</span>
            </div>
            <div>
              <span class="font-semibold">{mini()!.uniqueVisitors}</span>
              <span class="text-muted"> visitors</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <TimeSeries points={mini()!.series} compact />
          </div>
        </div>
      </Show>
    </div>
  );
}
