import { describe, it, expect, vi } from 'vitest';

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock('~/services/pocketbase', () => ({ pb: { send: mockSend } }));

import { statsStore } from './stats';

const payload = {
  views: 5,
  uniqueVisitors: 2,
  newVisitors: 1,
  avgDuration: 8,
  bounceRate: 0.5,
  currentVisitors: 1,
  series: [{ date: '2026-11-01', views: 5, uniqueVisitors: 2 }],
  referrers: [{ value: 'https://google.com', count: 2 }],
  browsers: [],
  os: [],
  devices: [],
  screens: [],
  pages: [],
};

describe('stats store', () => {
  it('loads stats from the endpoint and stores them', async () => {
    mockSend.mockResolvedValueOnce(payload);
    await statsStore.load('site1', { from: '2026-11-01T00:00:00Z', to: '2026-11-02T00:00:00Z' });

    expect(mockSend).toHaveBeenCalledWith('/api/ryni/sites/site1/stats', {
      query: { from: '2026-11-01T00:00:00Z', to: '2026-11-02T00:00:00Z' },
    });
    expect(statsStore.stats()).toMatchObject({ views: 5, uniqueVisitors: 2 });
    expect(statsStore.loading()).toBe(false);
  });
});
