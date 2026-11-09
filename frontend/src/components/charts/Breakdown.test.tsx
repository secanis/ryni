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
});
