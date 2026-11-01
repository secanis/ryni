import { describe, it, expect } from 'vitest';
import { getVisitorId, shouldTrack } from '../tracker/identity';
import { detectClient } from '../tracker/detect';
import { buildPayload, endpointUrl } from '../tracker/track';

function fakeStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
  };
}

describe('identity', () => {
  it('returns a stable id per site and distinct ids across sites', () => {
    const s = fakeStorage();
    const a1 = getVisitorId(s, 'siteA');
    const a2 = getVisitorId(s, 'siteA');
    const b = getVisitorId(s, 'siteB');
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
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
    const c = detectClient({ userAgent: ua, maxTouchPoints: 0 }, { width: 1920, height: 1080 });
    expect(c.browser).toBe('Chrome');
    expect(c.os).toBe('Windows');
    expect(c.device).toBe('Desktop');
    expect(c.screen).toBe('1920x1080');
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
      referrer: 'https://x.com',
      client: { browser: 'Firefox', os: 'Linux', device: 'Desktop', screen: '1280x720' },
    });
    expect(p).toEqual({
      visitor: 'v1',
      type: 'view',
      page: '/about',
      referrer: 'https://x.com',
      browser: 'Firefox',
      os: 'Linux',
      device: 'Desktop',
      screen: '1280x720',
    });
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
