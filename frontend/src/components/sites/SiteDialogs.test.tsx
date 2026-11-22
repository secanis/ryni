import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'solid-js/web';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('~/stores/sites', () => ({
  sitesStore: { update: mocks.update, remove: mocks.remove },
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => () => {},
}));

import TrackingCodeDialog from './TrackingCodeDialog';
import CampaignLinksDialog from './CampaignLinksDialog';
import DisclosureDialog from './DisclosureDialog';
import SiteSettingsDialog from './SiteSettingsDialog';
import type { Site } from '~/types';

const site: Site = {
  id: 's1',
  name: 'My Site',
  tracking_id: 'abc123',
  allowed_origins: ['https://example.com'],
  endpoint_slug: 'abc123',
  created_by: 'u1',
  managers: [],
  viewers: [],
  created: '',
  updated: '',
  tracking_mode: 'standard',
  disclosure_mode: 'text',
};

function mount(renderFn: () => unknown) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(renderFn as never, host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('site dialogs', () => {
  it('TrackingCodeDialog renders the title and both snippet variants', () => {
    const host = mount(() => <TrackingCodeDialog site={site} onClose={() => {}} />);
    expect(host.textContent).toContain('Tracking code');
    expect(host.textContent).toContain('Direct');
    expect(host.textContent).toContain('Proxy');
  });

  it('CampaignLinksDialog renders the title and the campaign builder', () => {
    const host = mount(() => <CampaignLinksDialog site={site} onClose={() => {}} />);
    expect(host.textContent).toContain('Campaign links');
    expect(host.textContent).toContain('Campaigns (UTM)');
  });

  it('DisclosureDialog renders the title and both copy blocks', () => {
    const host = mount(() => <DisclosureDialog site={site} onClose={() => {}} />);
    expect(host.textContent).toContain('Privacy disclosure');
    expect(host.textContent).toContain('Disclosure text');
    expect(host.textContent).toContain('Dismissal banner');
  });

  it('SiteSettingsDialog saves parsed labels', async () => {
    mocks.update.mockResolvedValueOnce({ ...site, labels: ['prod', 'Acme'] });
    const host = mount(() => (
      <SiteSettingsDialog site={{ ...site, labels: ['old'] }} onClose={() => {}} />
    ));

    const input = [...host.querySelectorAll('input')].find((i) => i.id === 'site-labels');
    if (!input) throw new Error('no #site-labels input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, 'prod, prod ,, Acme');
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const save = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Save'));
    if (!save) throw new Error('no Save button');
    save.click();
    await Promise.resolve();

    expect(mocks.update).toHaveBeenCalledWith(
      site.id,
      expect.objectContaining({ labels: ['prod', 'Acme'] }),
    );
  });

  it('DisclosureDialog defaults the banner link to the Rýni website', () => {
    const host = mount(() => <DisclosureDialog site={site} onClose={() => {}} />);
    const input = host.querySelector<HTMLInputElement>('#disclosure-url');
    expect(input).not.toBeNull();
    expect(input!.value).toBe('https://ryni.secanis.ch');
    expect(host.textContent).toContain('Learn more</a>');
  });
});
