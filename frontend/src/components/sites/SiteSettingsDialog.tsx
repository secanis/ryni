import { createSignal, untrack } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Trash2 } from 'lucide-solid';
import { sitesStore } from '~/stores/sites';
import { disclosureModeOf, trackingModeOf } from '~/utils/privacy';
import CopyButton from '~/components/ui/CopyButton';
import type { DisclosureMode, Site, TrackingMode } from '~/types';

// Edit dialog for an existing site: rename, change the allowed origins
// (the tracked site's URL(s) for Variant A), and pick the privacy tier and
// disclosure mode. Tracking code, campaign links and the disclosure preview
// live in their own dialogs. Also offers site deletion.
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
  const [trackingMode, setTrackingMode] = createSignal<TrackingMode>(
    untrack(() => trackingModeOf(props.site.tracking_mode)),
  );
  const [disclosureMode, setDisclosureMode] = createSignal<DisclosureMode>(
    untrack(() => disclosureModeOf(props.site.disclosure_mode)),
  );
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');

  const field = 'w-full border border-border rounded-radius-sm px-3 py-2 bg-surface dark:bg-surface-2';

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
        tracking_mode: trackingMode(),
        disclosure_mode: disclosureMode(),
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
        class="bg-surface rounded-radius-card shadow p-6 w-full max-w-2xl space-y-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-lg">Site settings</h2>
          <button
            onClick={() => props.onClose()}
            aria-label="Close"
            class="text-muted hover:text-text"
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
          <div>
            <label for="site-tracking-mode" class="block text-sm mb-1">
              Privacy tier
            </label>
            <select
              id="site-tracking-mode"
              value={trackingMode()}
              onChange={(e) => setTrackingMode(trackingModeOf(e.currentTarget.value))}
              class={field}
            >
              <option value="standard">Standard</option>
              <option value="session">Session</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>
          <div>
            <label for="site-disclosure-mode" class="block text-sm mb-1">
              Privacy disclosure
            </label>
            <select
              id="site-disclosure-mode"
              value={disclosureMode()}
              onChange={(e) => setDisclosureMode(disclosureModeOf(e.currentTarget.value))}
              class={field}
            >
              <option value="none">None</option>
              <option value="text">Text</option>
              <option value="banner">Banner</option>
            </select>
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

        {error() && <p class="text-danger text-sm">{error()}</p>}

        <div class="flex items-center justify-between pt-2">
          <button
            onClick={() => void remove()}
            class="inline-flex items-center gap-1.5 text-sm text-danger hover:opacity-70 transition-opacity"
          >
            <Trash2 size={15} />
            Delete site
          </button>
          <div class="flex gap-2">
            <button
              onClick={() => props.onClose()}
              class="px-4 py-2 rounded-radius-sm border border-border text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={busy()}
              class="bg-accent text-accent-fg rounded-radius-sm px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy() ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
