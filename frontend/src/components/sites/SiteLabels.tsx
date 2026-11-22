import { For, Show } from 'solid-js';

// Renders a site's labels as neutral outline pills. Outline (not filled)
// keeps them visually distinct from the filled manager/viewer role pills
// they sit beside on the dashboard. Renders nothing when there are none.
export default function SiteLabels(props: { labels: string[] }) {
  return (
    <Show when={props.labels.length > 0}>
      <div class="flex flex-wrap gap-1.5">
        <For each={props.labels}>
          {(label) => (
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-border text-muted">
              {label}
            </span>
          )}
        </For>
      </div>
    </Show>
  );
}
