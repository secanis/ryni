import { describe, it, expect, beforeAll } from 'vitest';
import { createAdminClient, createUserClient } from './helpers/client';

const rand = () => Math.random().toString(36).slice(2, 8);
const RANGE = { from: '2026-11-01T00:00:00.000Z', to: '2026-11-02T00:00:00.000Z' };

let admin: Awaited<ReturnType<typeof createAdminClient>>;
let owner: Awaited<ReturnType<typeof createUserClient>>;
let viewer: Awaited<ReturnType<typeof createUserClient>>;
let stranger: Awaited<ReturnType<typeof createUserClient>>;
let siteId: string;
let trackingId: string;

beforeAll(async () => {
  admin = await createAdminClient();
  owner = await createUserClient('export-owner');
  viewer = await createUserClient('export-viewer');
  stranger = await createUserClient('export-stranger');
  trackingId = rand();
  const site = await owner.pb.collection('sites').create({
    name: 'Export Site',
    tracking_id: trackingId,
    endpoint_slug: trackingId,
    allowed_origins: [],
    created_by: owner.userId,
  });
  siteId = site.id;
  await admin.collection('sites').update(siteId, { viewers: [viewer.userId] });
});

function seed(overrides: Record<string, unknown> = {}) {
  return admin.collection('records').create({
    site: siteId,
    visitor_id: 'v-secret',
    path: '/',
    created: '2026-11-03T10:00:00.000Z',
    is_new_visitor: false,
    ...overrides,
  });
}

function exportAs(client: any, query: Record<string, string> = RANGE) {
  return client.send(`/api/ryni/sites/${siteId}/export`, { query });
}

const dayRange = (day: string) => ({
  from: `${day}T00:00:00.000Z`,
  to: `${day}T23:59:59.999Z`,
});

describe('export route', () => {
  it('maps every stored field, excluding visitor_id, and includes site metadata', async () => {
    await seed({
      path: '/pricing',
      title: 'Pricing',
      referrer: 'https://example.com/',
      browser: 'Firefox',
      os: 'Linux',
      device: 'desktop',
      screen_size: '1920x1080',
      language: 'de-CH',
      timezone: 'Europe/Zurich',
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'launch',
      duration: 42,
      is_new_visitor: true,
    });

    const payload = await exportAs(owner.pb, dayRange('2026-11-03'));

    expect(payload.site).toEqual({
      id: siteId,
      name: 'Export Site',
      tracking_id: trackingId,
    });
    expect(payload.from).toBe('2026-11-03T00:00:00.000Z');
    expect(payload.to).toBe('2026-11-03T23:59:59.999Z');
    expect(typeof payload.exportedAt).toBe('string');

    const rows = payload.records.filter((r: any) => r.path === '/pricing');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      created: '2026-11-03T10:00:00.000Z',
      path: '/pricing',
      title: 'Pricing',
      referrer: 'https://example.com/',
      browser: 'Firefox',
      os: 'Linux',
      device: 'desktop',
      screen_size: '1920x1080',
      language: 'de-CH',
      timezone: 'Europe/Zurich',
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'launch',
      duration: 42,
      is_new_visitor: true,
    });
    expect(rows[0]).not.toHaveProperty('visitor_id');
    expect(JSON.stringify(payload)).not.toContain('v-secret');
  });

  it('orders records oldest first', async () => {
    await seed({ path: '/late', created: '2026-11-04T11:00:00.000Z' });
    await seed({ path: '/early', created: '2026-11-04T09:00:00.000Z' });
    await seed({ path: '/middle', created: '2026-11-04T10:00:00.000Z' });

    const payload = await exportAs(owner.pb, dayRange('2026-11-04'));
    expect(payload.records.map((r: any) => r.path)).toEqual(['/early', '/middle', '/late']);
  });

  it('includes records exactly on both range boundaries', async () => {
    await seed({ path: '/before', created: '2026-11-05T09:59:59.999Z' });
    await seed({ path: '/start', created: '2026-11-05T10:00:00.000Z' });
    await seed({ path: '/end', created: '2026-11-05T11:00:00.000Z' });
    await seed({ path: '/after', created: '2026-11-05T11:00:00.001Z' });

    const payload = await exportAs(owner.pb, {
      from: '2026-11-05T10:00:00.000Z',
      to: '2026-11-05T11:00:00.000Z',
    });
    expect(payload.records.map((r: any) => r.path)).toEqual(['/start', '/end']);
  });

  it('normalises records with only the required fields', async () => {
    await seed({ path: '/minimal', created: '2026-11-06T10:00:00.000Z' });

    const payload = await exportAs(owner.pb, dayRange('2026-11-06'));
    expect(payload.records).toHaveLength(1);
    expect(payload.records[0]).toEqual({
      created: '2026-11-06T10:00:00.000Z',
      path: '/minimal',
      title: '',
      referrer: '',
      browser: '',
      os: '',
      device: '',
      screen_size: '',
      language: '',
      timezone: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      duration: 0,
      is_new_visitor: false,
    });
  });

  it('returns an empty records array for a range with no data', async () => {
    const payload = await exportAs(owner.pb, {
      from: '2035-01-01T00:00:00.000Z',
      to: '2035-01-02T00:00:00.000Z',
    });
    expect(payload.records).toEqual([]);
  });

  it('allows a viewer of the site', async () => {
    const payload = await exportAs(viewer.pb);
    expect(Array.isArray(payload.records)).toBe(true);
  });

  it('allows a superuser', async () => {
    const payload = await exportAs(admin);
    expect(Array.isArray(payload.records)).toBe(true);
  });

  it('returns 403 for a non-member', async () => {
    await expect(exportAs(stranger.pb)).rejects.toMatchObject({ status: 403 });
  });

  it('returns 400 when from or to is missing or invalid', async () => {
    await expect(exportAs(owner.pb, { to: RANGE.to })).rejects.toMatchObject({ status: 400 });
    await expect(exportAs(owner.pb, { from: 'not-a-date', to: RANGE.to })).rejects.toMatchObject({
      status: 400,
    });
  });
});
