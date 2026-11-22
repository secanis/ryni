import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import SiteActionsMenu from './SiteActionsMenu';

function mount(props: { onCode: () => void; onCampaigns: () => void; onDisclosure: () => void }) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <SiteActionsMenu {...props} />, host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SiteActionsMenu', () => {
  it('starts closed and opens on the More button', () => {
    const host = mount({ onCode() {}, onCampaigns() {}, onDisclosure() {} });
    expect(host.textContent).not.toContain('Tracking code');
    (host.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(host.textContent).toContain('Tracking code');
    expect(host.textContent).toContain('Campaign links');
    expect(host.textContent).toContain('Privacy disclosure');
  });

  it('calls the matching handler and closes when an item is clicked', () => {
    let coded = 0;
    const host = mount({
      onCode() {
        coded++;
      },
      onCampaigns() {},
      onDisclosure() {},
    });
    (host.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    const item = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Tracking code'),
    ) as HTMLElement;
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(coded).toBe(1);
    expect(host.textContent).not.toContain('Tracking code');
  });
});
