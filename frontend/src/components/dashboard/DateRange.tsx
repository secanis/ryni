import { For } from 'solid-js';

export interface DateRangeValue {
  from: string;
  to: string;
}

const PRESETS: { key: string; label: string; ms: number }[] = [
  { key: '24h', label: '24h', ms: 24 * 3600 * 1000 },
  { key: '7d', label: '7 days', ms: 7 * 24 * 3600 * 1000 },
  { key: '30d', label: '30 days', ms: 30 * 24 * 3600 * 1000 },
];

export default function DateRange(props: {
  selected: string;
  onChange: (value: DateRangeValue) => void;
}) {
  function select(ms: number) {
    props.onChange({
      from: new Date(Date.now() - ms).toISOString(),
      to: new Date().toISOString(),
    });
  }

  return (
    <div class="flex gap-2">
      <For each={PRESETS}>
        {(p) => (
          <button
            onClick={() => select(p.ms)}
            class={`px-3 py-1 rounded-radius-sm text-sm border ${
              props.selected === p.key
                ? 'bg-accent text-accent-fg border-accent'
                : 'bg-surface border-border'
            }`}
          >
            {p.label}
          </button>
        )}
      </For>
    </div>
  );
}
