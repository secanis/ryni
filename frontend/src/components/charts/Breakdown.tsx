import { createSignal, For, Show } from 'solid-js';
import type { Breakdown as BreakdownItem } from '~/types';

const DEFAULT_VISIBLE = 5;

export default function Breakdown(props: { title: string; items: BreakdownItem[] }) {
  const [expanded, setExpanded] = createSignal(false);
  const max = () => Math.max(1, ...props.items.map((i) => i.count));
  const visible = () => (expanded() ? props.items : props.items.slice(0, DEFAULT_VISIBLE));
  const hidden = () => props.items.length - DEFAULT_VISIBLE;

  return (
    <div class="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      <h3 class="font-medium mb-3">{props.title}</h3>
      <Show when={props.items.length > 0} fallback={<p class="text-sm text-slate-500">No data</p>}>
        <ul class="space-y-2">
          <For each={visible()}>
            {(item) => (
              <li>
                <div class="flex justify-between text-sm mb-1">
                  <span class="truncate">{item.value}</span>
                  <span class="text-slate-500">{item.count}</span>
                </div>
                <div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded">
                  <div
                    class="h-1.5 bg-slate-400 dark:bg-slate-600 rounded"
                    style={{ width: `${(item.count / max()) * 100}%` }}
                  />
                </div>
              </li>
            )}
          </For>
        </ul>
        <Show when={hidden() > 0}>
          <button
            onClick={() => setExpanded((v) => !v)}
            class="mt-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {expanded() ? 'Show less' : `+${hidden()} more`}
          </button>
        </Show>
      </Show>
    </div>
  );
}
