import { For, Show, createSignal, createUniqueId, onCleanup, onMount } from 'solid-js';
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

// Polyline path string across points. `xy(i)` returns [x, y] for point i.
function linePath(n: number, xy: (i: number) => [number, number]): string {
  if (n === 0) return '';
  let d = '';
  for (let i = 0; i < n; i++) {
    const [px, py] = xy(i);
    d += `${i === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)} `;
  }
  return d.trimEnd();
}

// Area path: the line path closed down to the baseline.
function areaPath(n: number, xy: (i: number) => [number, number], baseline: number): string {
  if (n === 0) return '';
  const line = linePath(n, xy);
  const [x0] = xy(0);
  const [xn] = xy(n - 1);
  return `${line} L ${xn.toFixed(2)} ${baseline} L ${x0.toFixed(2)} ${baseline} Z`;
}

export default function TimeSeries(props: { points: SeriesPoint[]; compact?: boolean }) {
  return (
    <Show when={props.compact} fallback={<FullSeries points={props.points} />}>
      <MiniSeries points={props.points} />
    </Show>
  );
}

// Tiny sparkline for site cards: line + area, no axes or tooltip.
// `preserveAspectRatio="none"` is safe here (no text).
function MiniSeries(props: { points: SeriesPoint[] }) {
  const W = 600;
  const uid = createUniqueId();
  const n = () => props.points.length;
  const max = () => Math.max(1, ...props.points.map((p) => p.views));
  const step = () => (n() ? W / n() : W);
  const x = (i: number) => (i + 0.5) * step();
  const y = (v: number) => 62 - (v / max()) * 60;

  const line = () => linePath(n(), (i) => [x(i), y(props.points[i].views)]);
  const area = () => areaPath(n(), (i) => [x(i), y(props.points[i].views)], 62);

  return (
    <svg
      viewBox={`0 0 ${W} 64`}
      preserveAspectRatio="none"
      class="w-full h-16"
      role="img"
      aria-label="views over time"
    >
      <defs>
        <linearGradient id={`aurora-line-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ 'stop-color': 'var(--accent)' }} />
          <stop offset="100%" style={{ 'stop-color': 'var(--accent-3)' }} />
        </linearGradient>
        <linearGradient id={`aurora-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ 'stop-color': 'var(--accent)', 'stop-opacity': '0.35' }} />
          <stop offset="100%" style={{ 'stop-color': 'var(--accent)', 'stop-opacity': '0' }} />
        </linearGradient>
      </defs>
      <Show when={n() >= 2}>
        <path class="ryni-area" d={area()} fill={`url(#aurora-fill-${uid})`} />
        <path
          class="ryni-line"
          d={line()}
          fill="none"
          stroke={`url(#aurora-line-${uid})`}
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </Show>
      <Show when={n() === 1}>
        <circle cx={x(0)} cy={y(props.points[0].views)} r="3" fill="var(--accent)" />
      </Show>
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
  const uid = createUniqueId();

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
  const step = () => (n() ? plotW() / n() : plotW());
  const x = (i: number) => L + (i + 0.5) * step();
  const y = (views: number) => T + plotH() - (views / axisMax()) * plotH();
  const labels = () => xLabelIndices(n());
  const baseline = () => T + plotH();

  const line = () => linePath(n(), (i) => [x(i), y(props.points[i].views)]);
  const area = () => areaPath(n(), (i) => [x(i), y(props.points[i].views)], baseline());

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
        <defs>
          <linearGradient id={`aurora-line-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ 'stop-color': 'var(--accent)' }} />
            <stop offset="100%" style={{ 'stop-color': 'var(--accent-3)' }} />
          </linearGradient>
          <linearGradient id={`aurora-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ 'stop-color': 'var(--accent)', 'stop-opacity': '0.35' }} />
            <stop offset="100%" style={{ 'stop-color': 'var(--accent)', 'stop-opacity': '0' }} />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + y-axis tick labels */}
        <For each={ticks()}>
          {(t) => (
            <g>
              <line
                x1={L}
                x2={W() - R}
                y1={y(t)}
                y2={y(t)}
                class="stroke-border"
                stroke-width="1"
              />
              <text
                x={L - 6}
                y={y(t)}
                dy="0.35em"
                text-anchor="end"
                class="fill-muted text-[10px]"
              >
                {String(t)}
              </text>
            </g>
          )}
        </For>

        {/* x-axis date labels */}
        <For each={labels()}>
          {(idx) => (
            <text x={x(idx)} y={H - 6} text-anchor="middle" class="fill-muted text-[10px]">
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
          class="stroke-border-strong"
          stroke-width="1"
        />

        {/* area + line */}
        <Show when={n() >= 2}>
          <path class="ryni-area" d={area()} fill={`url(#aurora-fill-${uid})`} />
          <path
            class="ryni-line"
            d={line()}
            fill="none"
            stroke={`url(#aurora-line-${uid})`}
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </Show>

        {/* single-point dot */}
        <Show when={n() === 1}>
          <circle cx={x(0)} cy={y(props.points[0].views)} r="4" fill="var(--accent)" />
        </Show>

        {/* invisible per-point hover hit targets */}
        <For each={props.points}>
          {(p, i) => (
            <rect
              x={x(i()) - step() / 2}
              y={T}
              width={step()}
              height={plotH()}
              fill="transparent"
              aria-label={`${p.date}: ${p.views} views, ${p.uniqueVisitors} visitors`}
              onMouseEnter={() => setHover(i())}
            />
          )}
        </For>

        {/* hover highlight + tooltip */}
        <Show when={hovered()}>
          {(h) => {
            const dateStr = () => formatDate(h().point.date);
            const metricsStr = () => `${h().point.views} views · ${h().point.uniqueVisitors} visitors`;
            const tw = () => Math.max(dateStr().length, metricsStr().length) * 6.2 + 16;
            const th = 36;
            const gap = 8;
            const cx = () => x(h().index);
            const tx = () => Math.min(Math.max(cx(), tw() / 2 + 4), W() - tw() / 2 - 4);
            const ry = () => Math.max(2, y(h().point.views) - gap - th);
            return (
              <g pointer-events="none">
                <line
                  x1={cx()}
                  x2={cx()}
                  y1={T}
                  y2={baseline()}
                  class="stroke-accent-3"
                  stroke-width="1"
                  stroke-dasharray="3 3"
                />
                <circle
                  cx={cx()}
                  cy={y(h().point.views)}
                  r="4"
                  class="fill-surface stroke-accent-3"
                  stroke-width="2"
                />
                <rect
                  x={tx() - tw() / 2}
                  y={ry()}
                  width={tw()}
                  height={th}
                  rx={6}
                  class="fill-surface stroke-border"
                  stroke-width="1"
                />
                <text
                  x={tx()}
                  y={ry() + 16}
                  text-anchor="middle"
                  class="fill-text text-[11px] font-medium"
                >
                  {dateStr()}
                </text>
                <text x={tx()} y={ry() + 29} text-anchor="middle" class="fill-muted text-[11px]">
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
