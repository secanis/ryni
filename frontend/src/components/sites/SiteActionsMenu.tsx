import { createSignal, Show } from 'solid-js';
import { MoreHorizontal } from 'lucide-solid';

// Header "More" menu holding the rare site-setup actions (tracking code,
// campaign links, disclosure preview) so they don't crowd the primary cluster.
export default function SiteActionsMenu(props: {
  onCode: () => void;
  onCampaigns: () => void;
  onDisclosure: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}) {
  const [open, setOpen] = createSignal(false);
  const item = 'block w-full text-left px-4 py-2 text-sm hover:bg-surface-2';

  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open()}
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-radius-sm text-sm border border-border"
      >
        <MoreHorizontal size={15} />
        More
      </button>
      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div class="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-radius-card shadow z-50 py-1">
          <button
            type="button"
            class={item}
            onClick={() => {
              props.onCode();
              setOpen(false);
            }}
          >
            Tracking code
          </button>
          <button
            type="button"
            class={item}
            onClick={() => {
              props.onCampaigns();
              setOpen(false);
            }}
          >
            Campaign links
          </button>
          <button
            type="button"
            class={item}
            onClick={() => {
              props.onDisclosure();
              setOpen(false);
            }}
          >
            Privacy disclosure
          </button>
          <button
            type="button"
            class={item}
            onClick={() => {
              props.onExportCsv();
              setOpen(false);
            }}
          >
            Export CSV
          </button>
          <button
            type="button"
            class={item}
            onClick={() => {
              props.onExportJson();
              setOpen(false);
            }}
          >
            Export JSON
          </button>
        </div>
      </Show>
    </div>
  );
}
