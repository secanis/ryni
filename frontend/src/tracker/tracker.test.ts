import { describe, it, expect } from 'vitest';
import { resolveVisitorId, shouldTrack } from '../tracker/identity';
import { normalizeMode } from '../tracker/types';
import { detectClient } from '../tracker/detect';
import { buildPayload, endpointUrl } from '../tracker/track';

interface FakeStorage extends Pick<Storage, 'getItem' | 'setItem'> {
  map: Map<string, string>;
}

function fakeStorage(opts: { blocked?: boolean } = {}): FakeStorage {
  const m = new Map<string, string>();
  return {
    map: m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (opts.blocked) throw new Error('storage blocked');
      m.set(k, v);
    },
  };
}

describe('identity', () => {
  it('normalizeMode maps raw attribute values to modes', () => {
    expect(normalizeMode('session')).toBe('session');
    expect(normalizeMode('minimal')).toBe('minimal');
    expect(normalizeMode('garbage')).toBe('standard');
    expect(normalizeMode(undefined)).toBe('standard');
  });

  it('standard + working localStorage returns a stable id per site, distinct across sites', () => {
    const s = fakeStorage();
    const a1 = resolveVisitorId({ localStorage: s }, 'siteA', 'standard');
    const a2 = resolveVisitorId({ localStorage: s }, 'siteA', 'standard');
    const b = resolveVisitorId({ localStorage: s }, 'siteB', 'standard');
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
  });

  it('standard + blocked localStorage falls back to sessionStorage and stays stable', () => {
    const local = fakeStorage({ blocked: true });
    const session = fakeStorage();
    const first = resolveVisitorId({ localStorage: local, sessionStorage: session }, 'siteA', 'standard');
    const second = resolveVisitorId({ localStorage: local, sessionStorage: session }, 'siteA', 'standard');
    expect(first).toBe(second);
    expect(session.map.has('ryni_visitor_siteA')).toBe(true);
  });

  it('session mode reads sessionStorage only', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    local.setItem('ryni_visitor_siteA', 'local-id');
    session.setItem('ryni_visitor_siteA', 'session-id');
    const id = resolveVisitorId({ localStorage: local, sessionStorage: session }, 'siteA', 'session');
    expect(id).toBe('session-id');
  });

  it('minimal mode returns a fresh id and touches neither store', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    const a = resolveVisitorId({ localStorage: local, sessionStorage: session }, 'siteA', 'minimal');
    const b = resolveVisitorId({ localStorage: local, sessionStorage: session }, 'siteA', 'minimal');
    expect(a).not.toBe(b);
    expect(local.map.size).toBe(0);
    expect(session.map.size).toBe(0);
  });

  it('shouldTrack honors Do Not Track', () => {
    expect(shouldTrack({ doNotTrack: '1' })).toBe(false);
    expect(shouldTrack({ doNotTrack: '0' })).toBe(true);
    expect(shouldTrack({})).toBe(true);
  });
});

describe('detect', () => {
  it('detects browser/os/device from a desktop UA', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
    const c = detectClient({ userAgent: ua, maxTouchPoints: 0, language: 'de-CH' }, { width: 1920, height: 1080 });
    expect(c.browser).toBe('Chrome');
    expect(c.os).toBe('Windows');
    expect(c.device).toBe('Desktop');
    expect(c.screen).toBe('1920x1080');
    expect(c.language).toBe('de-CH');
    expect(typeof c.timezone).toBe('string');
  });

  it('detects mobile iOS', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
    const c = detectClient({ userAgent: ua, maxTouchPoints: 5 });
    expect(c.os).toBe('iOS');
    expect(c.device).toBe('Mobile');
  });
});

describe('track', () => {
  it('builds the ingest payload', () => {
    const p = buildPayload({
      visitor: 'v1',
      type: 'view',
      page: '/about',
      title: 'About',
      referrer: 'https://x.com',
      client: {
        browser: 'Firefox',
        os: 'Linux',
        device: 'Desktop',
        screen: '1280x720',
        language: 'en-US',
        timezone: 'America/New_York',
      },
      utm: { source: 'newsletter', medium: 'email', campaign: 'launch' },
    });
    expect(p).toEqual({
      visitor: 'v1',
      type: 'view',
      page: '/about',
      title: 'About',
      referrer: 'https://x.com',
      browser: 'Firefox',
      os: 'Linux',
      device: 'Desktop',
      screen: '1280x720',
      language: 'en-US',
      timezone: 'America/New_York',
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'launch',
    });
  });

  it('omits utm fields when no campaign params are present', () => {
    const p = buildPayload({ visitor: 'v1', type: 'view' });
    expect(p).toEqual({ visitor: 'v1', type: 'view' });
    expect('utm_source' in p).toBe(false);
    expect('language' in p).toBe(false);
  });

  it('omits empty referrer, includes duration', () => {
    const p = buildPayload({ visitor: 'v1', type: 'end', duration: 12 });
    expect(p).toEqual({ visitor: 'v1', type: 'end', duration: 12 });
    expect('referrer' in p).toBe(false);
  });

  it('builds the endpoint URL', () => {
    expect(endpointUrl('https://ryni.example/', 'abc123')).toBe('https://ryni.example/t/abc123');
  });
});
