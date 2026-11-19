import { describe, it, expect } from 'vitest';
import { buildCampaignUrl } from './campaignUrl';

describe('buildCampaignUrl', () => {
  it('appends the three campaign parameters', () => {
    expect(
      buildCampaignUrl({
        base: 'https://mysite.example/landing',
        source: 'newsletter',
        medium: 'email',
        campaign: 'launch-2026',
      }),
    ).toBe(
      'https://mysite.example/landing?utm_source=newsletter&utm_medium=email&utm_campaign=launch-2026',
    );
  });

  it('supports root-relative URLs', () => {
    expect(buildCampaignUrl({ base: '/landing', source: 'linkedin' })).toBe(
      '/landing?utm_source=linkedin',
    );
  });

  it('preserves existing query parameters and the fragment', () => {
    expect(
      buildCampaignUrl({ base: 'https://mysite.example/a?ref=x#top', campaign: 'spring' }),
    ).toBe('https://mysite.example/a?ref=x&utm_campaign=spring#top');
  });

  it('replaces existing campaign parameters instead of duplicating them', () => {
    expect(
      buildCampaignUrl({
        base: 'https://mysite.example/?utm_source=old&utm_medium=email&keep=1',
        source: 'new',
      }),
    ).toBe('https://mysite.example/?keep=1&utm_source=new');
  });

  it('omits empty values', () => {
    expect(buildCampaignUrl({ base: '/x', source: '  ', medium: 'social' })).toBe(
      '/x?utm_medium=social',
    );
  });

  it('returns the base unchanged when every value is empty', () => {
    expect(buildCampaignUrl({ base: '/x?a=1' })).toBe('/x?a=1');
    expect(buildCampaignUrl({ base: '/x?utm_source=old' })).toBe('/x?utm_source=old');
  });

  it('encodes values', () => {
    expect(buildCampaignUrl({ base: '/x', campaign: 'black friday & co' })).toBe(
      '/x?utm_campaign=black%20friday%20%26%20co',
    );
  });

  it('returns an empty string for an empty base', () => {
    expect(buildCampaignUrl({ base: '   ', source: 'x' })).toBe('');
  });
});
