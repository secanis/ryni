import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import type { SeriesPoint } from '~/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string): string {
  if (iso.includes('T')) {
    // hourly bucket: "YYYY-MM-DDTHH" -> "HH:00"
    const h = iso.slice(11, 13);
    return `${h}:00`;
  }
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[(m - 1) % 12]} ${d}`;
}

// Round a target interval up to a "nice" step (1/2/5 × 10^k).
function niceStep(range: number): number {
  const mag = 10 ** Math.floor(Math.log10(range));
  const norm = range / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
}

// y-axis scale: a nice top value and evenly spaced ticks from 0 up to it.
function yTicks(max: number): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 1, ticks: [0, 1] };
  if (max <= 4) {
    const ticks: number[] = [];
    for (let v = 0; v <= max; v++) ticks.push(v);
    return { max, ticks };
  }
  const step = niceStep(max / 4);
  const axisMax = step * Math.ceil(max / step);
  const ticks: number[] = [];
  for (let v = 0; v <= axisMax + 1e-9; v += step) ticks.push(v);
  return { max: axisMax, ticks };
}

// Sparse x-axis label positions (first, last, and a few spread between).
function xLabelIndices(n: number): number[] {
  if (n <= 1) return n === 1 ? [0] : [];
  const count = Math.min(n, 6);
  const set = new Set<number>([0, n - 1]);
  for (let i = 1; i < count - 1; i++) set.add(Math.round((i * (n - 1)) / (count - 1)));
  return [...set].sort((a, b) => a - b);
}

export default function TimeSeries(props: { points: SeriesPoint[]; compact?: boolean }) {
  return (
    <Show when={props.compact} fallback={<FullSeries points={props.points} />}>
      <MiniSeries points={props.points} />
    </Show>
  );
}

// Tiny sparkline for site cards: no axes or tooltip. `preserveAspectRatio="none"`
// is safe here (no text) and stretches the bars to fill the box.
function MiniSeries(props: { points: SeriesPoint[] }) {
  const W = 600;
  const max = () => Math.max(1, ...props.points.map((p) => p.views));
  const barW = () => (props.points.length ? W / props.points.length : W);
  return (
    <svg
      viewBox={`0 0 ${W} 64`}
      preserveAspectRatio="none"
      class="w-full h-16"
      role="img"
      aria-label="views over time"
    >
      <For each={props.points}>
        {(p, i) => {
          const h = () => Math.max(1, (p.views / max()) * 62);
          return (
            <rect
              x={i() * barW()}
              y={64 - h()}
              width={Math.max(1, barW() - 2)}
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

// Full chart with axes and hover tooltip. The viewBox width tracks the measured
// container width so the SVG maps 1:1 to pixels (no letterboxing, no text
// distortion) while still spanning the full card width.
function FullSeries(props: { points: SeriesPoint[] }) {
  const [hover, setHover] = createSignal<number | null>(null);
  const [width, setWidth] = createSignal(600);
  let host: HTMLDivElement | undefined;

  onMount(() => {
    const measure = () => setWidth(host?.clientWidth || 600);
    measure();
    window.addEventListener('resize', measure);
    onCleanup(() => window.removeEventListener('resize', measure));
  });

  const H = 192;
  const L = 40; // left gutter (y-axis labels)
  const R = 4; // right gutter
  const T = 8; // top gutter
  const B = 22; // bottom gutter (x-axis labels)

  const W = () => width();
  const plotW = () => W() - L - R;
  const plotH = () => H - T - B;
  const n = () => props.points.length;
  const rawMax = () => Math.max(0, ...props.points.map((p) => p.views));
  const scale = () => yTicks(rawMax());
  const axisMax = () => scale().max;
  const ticks = () => scale().ticks;
  const barW = () => (n() ? plotW() / n() : plotW());
  const barX = (i: number) => L + i * barW();
  const barY = (views: number) => T + plotH() - (views / axisMax()) * plotH();
  const barH = (views: number) => Math.max(0, (views / axisMax()) * plotH());
  const labels = () => xLabelIndices(n());
  const baseline = () => T + plotH();

  const hovered = () => {
    const i = hover();
    return i === null || i >= n() ? null : { index: i, point: props.points[i] };
  };

  return (
    <div ref={host} class="w-full">
      <svg
        viewBox={`0 0 ${W()} ${H}`}
        class="w-full"
        style={{ height: `${H}px`, display: 'block' }}
        role="img"
        aria-label="views over time"
        onMouseLeave={() => setHover(null)}
      >
        {/* horizontal gridlines + y-axis tick labels */}
        <For each={ticks()}>
          {(t) => (
            <g>
              <line
                x1={L}
                x2={W() - R}
                y1={barY(t)}
                y2={barY(t)}
                class="stroke-slate-200 dark:stroke-slate-700"
                stroke-width="1"
              />
              <text
                x={L - 6}
                y={barY(t)}
                dy="0.35em"
                text-anchor="end"
                class="fill-slate-400 text-[10px]"
              >
                {String(t)}
              </text>
            </g>
          )}
        </For>

        {/* x-axis date labels */}
        <For each={labels()}>
          {(idx) => (
            <text
              x={barX(idx) + barW() / 2}
              y={H - 6}
              text-anchor="middle"
              class="fill-slate-400 text-[10px]"
            >
              {formatDate(props.points[idx].date)}
            </text>
          )}
        </For>

        {/* axis baseline */}
        <line
          x1={L}
          x2={W() - R}
          y1={baseline()}
          y2={baseline()}
          class="stroke-slate-300 dark:stroke-slate-600"
          stroke-width="1"
        />

        {/* bars */}
        <For each={props.points}>
          {(p, i) => (
            <rect
              x={barX(i())}
              y={barY(p.views)}
              width={Math.max(1, barW() - 2)}
              height={barH(p.views)}
              aria-label={`${p.date}: ${p.views} views, ${p.uniqueVisitors} visitors`}
              class={hover() === i() ? 'fill-slate-500 dark:fill-slate-400' : 'fill-slate-400 dark:fill-slate-600'}
              onMouseEnter={() => setHover(i())}
            />
          )}
        </For>

        {/* hover tooltip */}
        <Show when={hovered()}>
          {(h) => {
            const dateStr = () => formatDate(h().point.date);
            const metricsStr = () => `${h().point.views} views · ${h().point.uniqueVisitors} visitors`;
            const tw = () => Math.max(dateStr().length, metricsStr().length) * 6.2 + 16;
            const th = 36;
            const gap = 8;
            const cx = () => barX(h().index) + barW() / 2;
            const tx = () => Math.min(Math.max(cx(), tw() / 2 + 4), W() - tw() / 2 - 4);
            const ry = () => Math.max(2, barY(h().point.views) - gap - th);
            return (
              <g pointer-events="none">
                <rect
                  x={tx() - tw() / 2}
                  y={ry()}
                  width={tw()}
                  height={th}
                  rx={6}
                  class="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700"
                  stroke-width="1"
                />
                <text
                  x={tx()}
                  y={ry() + 16}
                  text-anchor="middle"
                  class="fill-slate-700 dark:fill-slate-200 text-[11px] font-medium"
                >
                  {dateStr()}
                </text>
                <text
                  x={tx()}
                  y={ry() + 29}
                  text-anchor="middle"
                  class="fill-slate-500 dark:fill-slate-400 text-[11px]"
                >
                  {metricsStr()}
                </text>
              </g>
            );
          }}
        </Show>
      </svg>
    </div>
  );
}
