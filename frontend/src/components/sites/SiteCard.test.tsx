import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'solid-js/web';

vi.mock('~/services/pocketbase', () => ({
  pb: { send: vi.fn(() => Promise.reject(new Error('offline'))) },
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => () => {},
}));

import SiteCard from './SiteCard';
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
};

function mount(props: Partial<Site>) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <SiteCard site={{ ...site, ...props }} />, host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SiteCard', () => {
  it('renders the site labels', () => {
    const host = mount({ labels: ['production', 'acme'] });
    expect(host.textContent).toContain('production');
    expect(host.textContent).toContain('acme');
  });

  it('renders no label pills for a site without labels', () => {
    const host = mount({ labels: undefined });
    expect(host.querySelectorAll('span.rounded-full')).toHaveLength(0);
  });
});
