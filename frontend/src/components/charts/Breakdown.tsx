import { For, Show } from 'solid-js';
import type { Breakdown as BreakdownItem } from '~/types';

export default function Breakdown(props: { title: string; items: BreakdownItem[] }) {
  const max = () => Math.max(1, ...props.items.map((i) => i.count));

  return (
    <div class="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      <h3 class="font-medium mb-3">{props.title}</h3>
      <Show when={props.items.length > 0} fallback={<p class="text-sm text-slate-500">No data</p>}>
        <ul class="space-y-2">
          <For each={props.items}>
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
      </Show>
    </div>
  );
}
