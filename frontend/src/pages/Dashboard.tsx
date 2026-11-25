import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { Pencil, Share2 } from 'lucide-solid';
import { statsStore } from '~/stores/stats';
import { sitesStore } from '~/stores/sites';
import type { Site, SiteMembers } from '~/types';
import { trackingModeOf } from '~/utils/privacy';
import { siteLabels } from '~/utils/labels';
import StatCard from '~/components/dashboard/StatCard';
import DateRange, { type DateRangeValue } from '~/components/dashboard/DateRange';
import TimeSeries from '~/components/charts/TimeSeries';
import Breakdown from '~/components/charts/Breakdown';
import ShareDialog from '~/components/sites/ShareDialog';
import SiteSettingsDialog from '~/components/sites/SiteSettingsDialog';
import TrackingCodeDialog from '~/components/sites/TrackingCodeDialog';
import CampaignLinksDialog from '~/components/sites/CampaignLinksDialog';
import DisclosureDialog from '~/components/sites/DisclosureDialog';
import SiteActionsMenu from '~/components/sites/SiteActionsMenu';
import SiteLabels from '~/components/sites/SiteLabels';
import CopyButton from '~/components/ui/CopyButton';
import { downloadBlob } from '~/utils/download';
import { exportFilename, fetchSiteExport, toCsv, toJson } from '~/utils/siteExport';

export default function Dashboard() {
  const params = useParams();
  const siteId = () => params.id;
  const [selected, setSelected] = createSignal('7d');
  const [shareOpen, setShareOpen] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [codeOpen, setCodeOpen] = createSignal(false);
  const [campaignOpen, setCampaignOpen] = createSignal(false);
  const [disclosureOpen, setDisclosureOpen] = createSignal(false);
  const [site, setSite] = createSignal<Site | null>(null);
  const [members, setMembers] = createSignal<SiteMembers | null>(null);
  const [exportError, setExportError] = createSignal('');
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
  const mode = () => trackingModeOf(site()?.tracking_mode);

  async function exportData(format: 'csv' | 'json') {
    setExportError('');
    try {
      const payload = await fetchSiteExport(siteId()!, range());
      const body = format === 'csv' ? toCsv(payload) : toJson(payload);
      const type =
        format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
      downloadBlob(
        new Blob([body], { type }),
        exportFilename(payload.site.name, payload.from, payload.to, format),
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    }
  }

  const cards = createMemo(() => {
    const stats = s();
    if (!stats) return [];
    const m = mode();
    const list = [{ label: 'Views', value: String(stats.views) }];
    if (m !== 'minimal') {
      list.push({
        label: m === 'session' ? 'Visitors (per session)' : 'Unique visitors',
        value: String(stats.uniqueVisitors),
      });
    }
    if (m === 'standard') {
      list.push(
        { label: 'New visitors', value: String(stats.newVisitors) },
        { label: 'Returning visitors', value: String(stats.returningVisitors) },
      );
    }
    if (m !== 'minimal') {
      list.push(
        { label: 'Sessions', value: String(stats.sessions) },
        { label: 'Avg duration', value: `${stats.avgDuration}s` },
        { label: 'Avg session duration', value: `${stats.avgSessionDuration}s` },
        { label: 'Bounce rate', value: `${Math.round(stats.bounceRate * 100)}%` },
        { label: 'Pages / session', value: String(stats.pagesPerSession) },
        { label: 'Current', value: String(stats.currentVisitors) },
      );
    }
    return list;
  });

  const tierNote = () => {
    switch (mode()) {
      case 'session':
        return "Visits are measured per browsing session, so returning-visitor counts aren't tracked.";
      case 'minimal':
        return "Page views and per-page breakdowns (browser, OS, device, screen, language, time zone, referrer, UTM) are recorded — nothing is stored on visitors' devices, so visits can't be linked together.";
      default:
        return 'Unique visitors are per browser profile and reset when browsing data is cleared.';
    }
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">{site()?.name ?? 'Dashboard'}</h1>
          <div class="text-sm text-muted font-mono flex items-center gap-2 mt-1">
            <span>{site()?.tracking_id ?? ''}</span>
            <CopyButton text={site()?.tracking_id ?? ''} />
          </div>
          <Show when={siteLabels(site() ?? {}).length > 0 || members()}>
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <SiteLabels labels={siteLabels(site() ?? {})} />
              <Show when={members()}>
                <For each={members()!.managers}>
                  {(m) => (
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface-2 text-accent-3">
                      <span class="font-medium">{m.name || m.email}</span>
                      <span class="opacity-70">manager</span>
                    </span>
                  )}
                </For>
                <For each={members()!.viewers}>
                  {(m) => (
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface-2 text-muted">
                      <span class="font-medium">{m.name || m.email}</span>
                      <span class="opacity-70">viewer</span>
                    </span>
                  )}
                </For>
              </Show>
            </div>
          </Show>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={() => setShareOpen(true)}
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-radius-sm text-sm border border-border"
          >
            <Share2 size={15} />
            Share
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-radius-sm text-sm border border-border"
          >
            <Pencil size={15} />
            Edit
          </button>
          <SiteActionsMenu
            onCode={() => setCodeOpen(true)}
            onCampaigns={() => setCampaignOpen(true)}
            onDisclosure={() => setDisclosureOpen(true)}
            onExportCsv={() => void exportData('csv')}
            onExportJson={() => void exportData('json')}
          />
          <DateRange selected={selected()} onChange={onRange} />
        </div>
      </div>

      <Show when={exportError()}>
        <p class="text-xs text-danger">{exportError()}</p>
      </Show>

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

      <Show when={codeOpen() && site()}>
        <TrackingCodeDialog site={site()!} onClose={() => setCodeOpen(false)} />
      </Show>

      <Show when={campaignOpen() && site()}>
        <CampaignLinksDialog site={site()!} onClose={() => setCampaignOpen(false)} />
      </Show>

      <Show when={disclosureOpen() && site()}>
        <DisclosureDialog site={site()!} onClose={() => setDisclosureOpen(false)} />
      </Show>

      <Show when={!statsStore.loading() && s()} fallback={<p class="text-muted">Loading…</p>}>
        <div>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <For each={cards()}>
              {(card) => <StatCard label={card.label} value={card.value} />}
            </For>
          </div>
          <p class="text-xs text-muted mt-2">{tierNote()}</p>
        </div>

        <div class="p-4 bg-surface rounded-radius-card border border-border">
          <h3 class="font-medium mb-3">Views over time</h3>
          <TimeSeries points={s()!.series} showUniques={mode() !== 'minimal'} />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Breakdown title="Referrers" items={s()!.referrers} />
          <Breakdown title="UTM source" items={s()!.utmSources} />
          <Breakdown title="UTM medium" items={s()!.utmMediums} />
          <Breakdown title="UTM campaign" items={s()!.utmCampaigns} />
          <Show when={mode() !== 'minimal'}>
            <Breakdown title="Landing pages" items={s()!.landingPages} />
            <Breakdown title="Exit pages" items={s()!.exitPages} />
          </Show>
          <Breakdown title="Pages" items={s()!.pages} />
          <Breakdown title="Page titles" items={s()!.titles} />
          <Breakdown title="Browsers" items={s()!.browsers} />
          <Breakdown title="Operating systems" items={s()!.os} />
          <Breakdown title="Devices" items={s()!.devices} />
          <Breakdown title="Screen sizes" items={s()!.screens} />
          <Breakdown title="Languages" items={s()!.languages} />
          <Breakdown title="Timezones" items={s()!.timezones} />
          <Breakdown title="Hour of day" items={s()!.hours} />
          <Breakdown title="Day of week" items={s()!.daysOfWeek} />
          <Show when={mode() !== 'minimal'}>
            <Breakdown title="Duration" items={s()!.durations} />
          </Show>
        </div>
      </Show>
    </div>
  );
}
