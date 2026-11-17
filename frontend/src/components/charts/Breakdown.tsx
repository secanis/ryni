import { createSignal, For, Show } from 'solid-js';
import type { Breakdown as BreakdownItem } from '~/types';

const DEFAULT_VISIBLE = 5;

export default function Breakdown(props: { title: string; items: BreakdownItem[] }) {
  const [expanded, setExpanded] = createSignal(false);
  const max = () => Math.max(1, ...props.items.map((i) => i.count));
  const visible = () => (expanded() ? props.items : props.items.slice(0, DEFAULT_VISIBLE));
  const hidden = () => props.items.length - DEFAULT_VISIBLE;

  return (
    <div class="p-4 bg-surface rounded-radius-card border border-border">
      <h3 class="font-medium mb-3">{props.title}</h3>
      <Show when={props.items.length > 0} fallback={<p class="text-sm text-muted">No data</p>}>
        <ul class="space-y-2">
          <For each={visible()}>
            {(item, i) => (
              <li>
                <div class="flex justify-between text-sm mb-1">
                  <span class="truncate">{item.value}</span>
                  <span class="text-muted font-mono tabular-nums">{item.count}</span>
                </div>
                <div class="h-1.5 bg-surface-2 rounded">
                  <div
                    class="h-1.5 rounded"
                    style={{ width: `${(item.count / max()) * 100}%`, background: `var(--series-${(i() % 8) + 1})` }}
                  />
                </div>
              </li>
            )}
          </For>
        </ul>
        <Show when={hidden() > 0}>
          <button
            onClick={() => setExpanded((v) => !v)}
            class="mt-2 text-xs text-muted hover:text-text"
          >
            {expanded() ? 'Show less' : `+${hidden()} more`}
          </button>
        </Show>
      </Show>
    </div>
  );
}
