import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import SiteLabels from './SiteLabels';

function mount(labels: string[]) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <SiteLabels labels={labels} />, host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SiteLabels', () => {
  it('renders nothing for an empty list', () => {
    expect(mount([]).textContent).toBe('');
  });

  it('renders one pill per label', () => {
    const host = mount(['production', 'acme']);
    expect([...host.querySelectorAll('span')].map((s) => s.textContent)).toEqual([
      'production',
      'acme',
    ]);
  });

  it('renders pills as siblings, without a wrapper element', () => {
    const host = mount(['production', 'acme']);
    expect(host.querySelector('div')).toBeNull();
  });
});
