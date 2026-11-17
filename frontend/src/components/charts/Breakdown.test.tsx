import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import Breakdown from './Breakdown';
import type { Breakdown as BreakdownItem } from '~/types';

const items: BreakdownItem[] = Array.from({ length: 8 }, (_, i) => ({
  value: `item-${i + 1}`,
  count: 8 - i,
}));

function renderCard() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <Breakdown title="Referrers" items={items} />, host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Breakdown', () => {
  it('shows the first 5 items and a "+N more" toggle by default', () => {
    const host = renderCard();
    expect(host.querySelectorAll('li')).toHaveLength(5);
    const btn = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('more'));
    expect(btn?.textContent?.trim()).toBe('+3 more');
  });

  it('expands to show all items and back again', () => {
    const host = renderCard();
    const btn = () => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('more') || b.textContent?.includes('less'));
    btn()?.click();
    expect(host.querySelectorAll('li')).toHaveLength(8);
    expect(btn()?.textContent?.trim()).toBe('Show less');
    btn()?.click();
    expect(host.querySelectorAll('li')).toHaveLength(5);
  });

  it('shows no toggle when there are 5 or fewer items', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => <Breakdown title="OS" items={items.slice(0, 3)} />, host);
    expect(host.querySelectorAll('li')).toHaveLength(3);
    expect(host.querySelector('button')).toBeNull();
  });

  it('renders counts in a mono face with tabular numerals', () => {
    const host = renderCard();
    const counts = [...host.querySelectorAll('span')].filter((s) => /^\d+$/.test(s.textContent ?? ''));
    expect(counts.length).toBeGreaterThan(0);
    counts.forEach((c) => {
      expect(c.getAttribute('class')).toContain('font-mono');
      expect(c.getAttribute('class')).toContain('tabular-nums');
    });
  });

  it('cycles the categorical ramp across bars (wraps past 8)', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => <Breakdown title="Pages" items={Array.from({ length: 9 }, (_, i) => ({ value: `p${i}`, count: 9 - i }))} />, host);
    // expand past the default 5 visible items to see the 9th (wrap) bar
    const more = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('more'));
    more?.click();
    const fills = [...host.querySelectorAll('div[style*="--series-"]')];
    expect(fills.length).toBe(9);
    expect(fills[0].getAttribute('style')).not.toBe(fills[1].getAttribute('style'));
    expect(fills[8].getAttribute('style')).toContain('--series-1'); // wraps
  });
});
