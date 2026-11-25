import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import SiteActionsMenu from './SiteActionsMenu';

function mount(props: {
  onCode: () => void;
  onCampaigns: () => void;
  onDisclosure: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <SiteActionsMenu {...props} />, host);
  return host;
}

const noop = {
  onCode() {},
  onCampaigns() {},
  onDisclosure() {},
  onExportCsv() {},
  onExportJson() {},
};

function open(host: HTMLElement) {
  (host.querySelector('button') as HTMLElement).dispatchEvent(
    new MouseEvent('click', { bubbles: true }),
  );
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SiteActionsMenu', () => {
  it('starts closed and opens on the More button', () => {
    const host = mount(noop);
    expect(host.textContent).not.toContain('Tracking code');
    open(host);
    expect(host.textContent).toContain('Tracking code');
    expect(host.textContent).toContain('Campaign links');
    expect(host.textContent).toContain('Privacy disclosure');
    expect(host.textContent).toContain('Export CSV');
    expect(host.textContent).toContain('Export JSON');
  });

  it('calls the matching handler and closes when an item is clicked', () => {
    let coded = 0;
    const host = mount({ ...noop, onCode: () => coded++ });
    open(host);
    const item = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Tracking code'),
    ) as HTMLElement;
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(coded).toBe(1);
    expect(host.textContent).not.toContain('Tracking code');
  });

  it('calls the CSV export handler and closes', () => {
    let csv = 0;
    const host = mount({ ...noop, onExportCsv: () => csv++ });
    open(host);
    const item = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Export CSV'),
    ) as HTMLElement;
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(csv).toBe(1);
    expect(host.textContent).not.toContain('Export CSV');
  });
});
