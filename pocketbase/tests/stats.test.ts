import { describe, it, expect, beforeAll } from 'vitest';
import { getPbUrl } from '../setup';
import { createAdminClient, createUserClient } from './helpers/client';

const rand = () => Math.random().toString(36).slice(2, 8);

let admin: Awaited<ReturnType<typeof createAdminClient>>;
let a: Awaited<ReturnType<typeof createUserClient>>;
let b: Awaited<ReturnType<typeof createUserClient>>;
let siteId: string;

beforeAll(async () => {
  admin = await createAdminClient();
  a = await createUserClient('a');
  b = await createUserClient('b');
  const s = rand();
  const site = await a.pb.collection('sites').create({
    name: 'Stats Site',
    tracking_id: s,
    endpoint_slug: s,
    allowed_origins: [],
    created_by: a.userId,
  });
  siteId = site.id;
});

function seedRecord(overrides: Record<string, unknown>) {
  return admin.collection('records').create({
    site: siteId,
    visitor_id: 'v',
    path: '/',
    created: '2026-11-01T10:00:00.000Z',
    is_new_visitor: false,
    ...overrides,
  });
}

async function stats(as: 'a' | 'b') {
  const client = as === 'a' ? a.pb : b.pb;
  return client.send(`/api/ryni/sites/${siteId}/stats`, {
    query: { from: '2026-11-01T00:00:00.000Z', to: '2026-11-02T00:00:00.000Z' },
  });
}

async function statsRange(as: 'a' | 'b', from: string, to: string) {
  const client = as === 'a' ? a.pb : b.pb;
  return client.send(`/api/ryni/sites/${siteId}/stats`, { query: { from, to } });
}

describe('stats route', () => {
  it('aggregates views, uniques, new visitors, duration, bounce rate', async () => {
    // v1: 3 views in one session (10:00, 10:05, 10:10), durations 10 and 5.
    await seedRecord({ visitor_id: 'v1', path: '/a', created: '2026-11-01T10:00:00.000Z', is_new_visitor: true, duration: 10 });
    await seedRecord({ visitor_id: 'v1', path: '/b', created: '2026-11-01T10:05:00.000Z', duration: 5 });
    await seedRecord({ visitor_id: 'v1', path: '/c', created: '2026-11-01T10:10:00.000Z' });
    // v2: single view → bounce.
    await seedRecord({ visitor_id: 'v2', path: '/x', created: '2026-11-01T10:00:00.000Z', is_new_visitor: true });
    // v3: two views 60 min apart → two single-view sessions (two bounces).
    await seedRecord({ visitor_id: 'v3', path: '/m', created: '2026-11-01T10:00:00.000Z', is_new_visitor: true });
    await seedRecord({ visitor_id: 'v3', path: '/n', created: '2026-11-01T11:00:00.000Z' });

    const res = await stats('a');
    expect(res).toMatchObject({
      views: 6,
      uniqueVisitors: 3,
      newVisitors: 3,
      avgDuration: 8, // (10 + 5) / 2 = 7.5 → round 8
      sessions: 4,
      returningVisitors: 0,
      pagesPerSession: 1.5,
      avgSessionDuration: 150, // v1 session 10:00→10:10 = 600s; others 0
    });
    expect(res.bounceRate).toBeCloseTo(0.75); // 3 bounces / 4 sessions
    expect(res.series.length).toBeGreaterThan(0);
    expect(res.landingPages).toContainEqual({ value: '/a', count: 1 });
    expect(res.exitPages).toContainEqual({ value: '/c', count: 1 });
  });

  it('breaks down hour of day, day of week and duration', async () => {
    const res = await stats('a');
    // 5 records at 10:00-ish, 1 at 11:00 (all 2026-11-01).
    expect(res.hours).toContainEqual({ value: '10h', count: 5 });
    expect(res.daysOfWeek[0].count).toBe(6);
    // durations 10 and 5 both fall in the 0-10s bucket.
    expect(res.durations).toContainEqual({ value: '0-10s', count: 2 });
  });

  it('scales the series hourly for 24h and daily for longer ranges', async () => {
    const hourlyRes = await statsRange('a', '2026-11-01T00:00:00.000Z', '2026-11-02T00:00:00.000Z');
    expect(hourlyRes.series.length).toBeGreaterThan(0);
    expect(hourlyRes.series[0].date).toContain('T'); // "YYYY-MM-DDTHH"

    const dailyRes = await statsRange('a', '2026-10-01T00:00:00.000Z', '2026-11-02T00:00:00.000Z');
    expect(dailyRes.series.length).toBeGreaterThan(0);
    expect(dailyRes.series[0].date).not.toContain('T'); // "YYYY-MM-DD"
  });

  it('counts current visitors from recent heartbeats', async () => {
    await admin.collection('heartbeats').create({
      site: siteId,
      visitor_id: 'live-1',
      last_seen: new Date().toISOString(),
    });
    await admin.collection('heartbeats').create({
      site: siteId,
      visitor_id: 'live-2',
      last_seen: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });

    const res = await stats('a');
    expect(res.currentVisitors).toBe(1);
  });

  it('breaks down language, timezone, title and utm', async () => {
    await seedRecord({ visitor_id: 'm1', language: 'de', timezone: 'Europe/Zurich', title: 'Home', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'summer', created: '2026-11-01T12:00:00.000Z' });
    await seedRecord({ visitor_id: 'm2', language: 'de', timezone: 'Europe/Zurich', title: 'About', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'summer', created: '2026-11-01T12:01:00.000Z' });

    const res = await stats('a');
    expect(res.languages).toContainEqual({ value: 'de', count: 2 });
    expect(res.timezones).toContainEqual({ value: 'Europe/Zurich', count: 2 });
    expect(res.titles).toContainEqual({ value: 'Home', count: 1 });
    expect(res.utmSources).toContainEqual({ value: 'google', count: 2 });
    expect(res.utmMediums).toContainEqual({ value: 'cpc', count: 2 });
    expect(res.utmCampaigns).toContainEqual({ value: 'summer', count: 2 });
  });

  it('breaks down referrers and pages', async () => {
    await seedRecord({ visitor_id: 'r1', referrer: 'https://google.com', path: '/from-google', created: '2026-11-01T09:00:00.000Z' });
    await seedRecord({ visitor_id: 'r2', referrer: 'https://google.com', path: '/from-google-2', created: '2026-11-01T09:01:00.000Z' });
    await seedRecord({ visitor_id: 'r3', referrer: 'https://bing.com', created: '2026-11-01T09:02:00.000Z' });

    const res = await stats('a');
    expect(res.referrers[0]).toMatchObject({ value: 'https://google.com', count: 2 });
  });

  it('returns 403 for a non-member', async () => {
    await expect(stats('b')).rejects.toMatchObject({ status: 403 });
  });
});
