import { createSignal, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { pb } from '~/services/pocketbase';
import type { SeriesPoint, Site } from '~/types';
import CopyButton from '~/components/ui/CopyButton';
import TimeSeries from '~/components/charts/TimeSeries';

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
      class="p-4 bg-white dark:bg-slate-900 rounded-lg shadow hover:shadow-md transition border border-slate-200 dark:border-slate-800 cursor-pointer"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="font-medium truncate">{props.site.name}</div>
          <div class="text-sm text-slate-500 font-mono">{props.site.tracking_id}</div>
        </div>
        <span onClick={(e) => e.stopPropagation()}>
          <CopyButton text={props.site.tracking_id} />
        </span>
      </div>

      <Show when={mini()}>
        <div class="mt-3 flex items-center justify-between gap-3">
          <div class="text-sm space-y-1 shrink-0">
            <div>
              <span class="font-semibold">{mini()!.views}</span>
              <span class="text-slate-500"> views</span>
            </div>
            <div>
              <span class="font-semibold">{mini()!.uniqueVisitors}</span>
              <span class="text-slate-500"> visitors</span>
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
