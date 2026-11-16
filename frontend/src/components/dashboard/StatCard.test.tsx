import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import StatCard from './StatCard';

function renderCard() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <StatCard label="Views" value="84,200" />, host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('StatCard', () => {
  it('renders the value in a mono face with tabular numerals', () => {
    const host = renderCard();
    const val = [...host.querySelectorAll('div')].find((d) => d.textContent === '84,200');
    expect(val).toBeTruthy();
    expect(val!.getAttribute('class')).toContain('font-mono');
    expect(val!.getAttribute('class')).toContain('tabular-nums');
  });
});
