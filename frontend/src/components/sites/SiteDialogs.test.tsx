import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import TrackingCodeDialog from './TrackingCodeDialog';
import CampaignLinksDialog from './CampaignLinksDialog';
import DisclosureDialog from './DisclosureDialog';
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
});
