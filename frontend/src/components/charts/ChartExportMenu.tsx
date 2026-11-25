import { createSignal, Show } from 'solid-js';
import { Download } from 'lucide-solid';

// Chart-card menu: save the rendered views chart as a PNG or JPG.
export default function ChartExportMenu(props: {
  onExport: (type: 'png' | 'jpeg') => void;
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
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-radius-sm text-xs border border-border"
      >
        <Download size={13} />
        Export
      </button>
      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div class="absolute right-0 mt-1 w-32 bg-surface border border-border rounded-radius-card shadow z-50 py-1">
          <button
            type="button"
            class={item}
            onClick={() => {
              props.onExport('png');
              setOpen(false);
            }}
          >
            PNG
          </button>
          <button
            type="button"
            class={item}
            onClick={() => {
              props.onExport('jpeg');
              setOpen(false);
            }}
          >
            JPG
          </button>
        </div>
      </Show>
    </div>
  );
}
