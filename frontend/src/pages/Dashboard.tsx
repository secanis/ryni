import { createEffect, createSignal, For, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { statsStore } from '~/stores/stats';
import { sitesStore } from '~/stores/sites';
import type { Site, SiteMembers } from '~/types';
import StatCard from '~/components/dashboard/StatCard';
import DateRange, { type DateRangeValue } from '~/components/dashboard/DateRange';
import TimeSeries from '~/components/charts/TimeSeries';
import Breakdown from '~/components/charts/Breakdown';
import ShareDialog from '~/components/sites/ShareDialog';
import SiteSettingsDialog from '~/components/sites/SiteSettingsDialog';
import CopyButton from '~/components/ui/CopyButton';

export default function Dashboard() {
  const params = useParams();
  const siteId = () => params.id;
  const [selected, setSelected] = createSignal('7d');
  const [shareOpen, setShareOpen] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [site, setSite] = createSignal<Site | null>(null);
  const [members, setMembers] = createSignal<SiteMembers | null>(null);
  const [range, setRange] = createSignal<DateRangeValue>({
    from: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    to: new Date().toISOString(),
  });

  createEffect(() => {
    const id = siteId();
    if (id) void statsStore.load(id, range());
  });

  createEffect(() => {
    const id = siteId();
    if (id) void sitesStore.get(id).then(setSite);
  });

  createEffect(() => {
    const id = siteId();
    if (id) void sitesStore.getMembers(id).then(setMembers).catch(() => setMembers(null));
  });

  function onRange(next: DateRangeValue) {
    setRange(next);
    setSelected(
      next.from === new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString() ? '7d' : 'custom',
    );
  }

  const s = () => statsStore.stats();

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">{site()?.name ?? 'Dashboard'}</h1>
          <div class="text-sm text-slate-500 font-mono flex items-center gap-2 mt-1">
            <span>{site()?.tracking_id ?? ''}</span>
            <CopyButton text={site()?.tracking_id ?? ''} />
          </div>
          <Show when={members()}>
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <For each={members()!.managers}>
                {(m) => (
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    <span class="font-medium">{m.name || m.email}</span>
                    <span class="opacity-70">manager</span>
                  </span>
                )}
              </For>
              <For each={members()!.viewers}>
                {(m) => (
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <span class="font-medium">{m.name || m.email}</span>
                    <span class="opacity-70">viewer</span>
                  </span>
                )}
              </For>
            </div>
          </Show>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={() => setShareOpen(true)}
            class="px-3 py-1 rounded text-sm border border-slate-300 dark:border-slate-700"
          >
            Share
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            class="px-3 py-1 rounded text-sm border border-slate-300 dark:border-slate-700"
          >
            Edit
          </button>
          <DateRange selected={selected()} onChange={onRange} />
        </div>
      </div>

      <Show when={shareOpen()}>
        <ShareDialog siteId={siteId() || ''} onClose={() => setShareOpen(false)} />
      </Show>

      <Show when={settingsOpen() && site()}>
        <SiteSettingsDialog
          site={site()!}
          onClose={() => setSettingsOpen(false)}
          onSaved={setSite}
        />
      </Show>

      <Show when={!statsStore.loading() && s()} fallback={<p class="text-slate-500">Loading…</p>}>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Views" value={String(s()!.views)} />
          <StatCard label="Unique visitors" value={String(s()!.uniqueVisitors)} />
          <StatCard label="Avg duration" value={`${s()!.avgDuration}s`} />
          <StatCard label="Bounce rate" value={`${Math.round(s()!.bounceRate * 100)}%`} />
          <StatCard label="Current" value={String(s()!.currentVisitors)} />
        </div>

        <div class="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <h3 class="font-medium mb-3">Views over time</h3>
          <TimeSeries points={s()!.series} />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Breakdown title="Referrers" items={s()!.referrers} />
          <Breakdown title="Browsers" items={s()!.browsers} />
          <Breakdown title="Operating systems" items={s()!.os} />
          <Breakdown title="Devices" items={s()!.devices} />
          <Breakdown title="Screen sizes" items={s()!.screens} />
          <Breakdown title="Pages" items={s()!.pages} />
        </div>
      </Show>
    </div>
  );
}
