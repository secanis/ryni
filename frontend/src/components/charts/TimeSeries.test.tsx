import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import TimeSeries from './TimeSeries';
import type { SeriesPoint } from '~/types';

const points: SeriesPoint[] = [
  { date: '2026-11-01', views: 3, uniqueVisitors: 2 },
  { date: '2026-11-02', views: 5, uniqueVisitors: 4 },
  { date: '2026-11-03', views: 12, uniqueVisitors: 7 },
  { date: '2026-11-04', views: 8, uniqueVisitors: 6 },
];

function renderChart() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <TimeSeries points={points} />, host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('TimeSeries', () => {
  it('renders one bar per point', () => {
    const host = renderChart();
    // bars only — tooltip rect is absent until hover
    const bars = [...host.querySelectorAll('rect')].filter((r) => r.getAttribute('aria-label'));
    expect(bars).toHaveLength(points.length);
  });

  it('draws x-axis date labels', () => {
    const host = renderChart();
    const texts = [...host.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toContain('Nov 1');
    expect(texts).toContain('Nov 4');
  });

  it('draws y-axis tick labels from 0 up to the axis max', () => {
    const host = renderChart();
    const texts = [...host.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toContain('0');
    expect(texts).toContain('15'); // axisMax for max=12 is 15
  });

  it('shows a tooltip on hover with views and unique visitors', () => {
    const host = renderChart();
    const bar = [...host.querySelectorAll('rect')].find((r) => r.getAttribute('aria-label'));
    bar?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    const texts = [...host.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts.some((t) => t?.includes('views ·'))).toBe(true);
    expect(texts.some((t) => t?.includes('visitors'))).toBe(true);
  });
});
