import { For } from 'solid-js';
import type { SeriesPoint } from '~/types';

const W = 600;

export default function TimeSeries(props: { points: SeriesPoint[]; compact?: boolean }) {
  const H = () => (props.compact ? 64 : 200);
  const PAD = () => (props.compact ? 2 : 4);
  const max = () => Math.max(1, ...props.points.map((p) => p.views));
  const barW = () => (props.points.length ? W / props.points.length : W);

  return (
    <svg
      viewBox={`0 0 ${W} ${H()}`}
      class={`w-full ${props.compact ? 'h-16' : 'h-48'}`}
      role="img"
      aria-label="views over time"
    >
      <For each={props.points}>
        {(p, i) => {
          const h = () => Math.max(1, (p.views / max()) * (H() - 20));
          const x = () => i() * barW();
          const y = () => H() - h();
          return (
            <rect
              x={x()}
              y={y()}
              width={Math.max(1, barW() - PAD())}
              height={h()}
              class="fill-slate-400 dark:fill-slate-600"
            >
              <title>
                {p.date}: {p.views} views
              </title>
            </rect>
          );
        }}
      </For>
    </svg>
  );
}
