import { describe, it, expect, beforeAll } from 'vitest';
import { getPbUrl } from '../setup';
import { createAdminClient } from './helpers/client';

const rand = () => Math.random().toString(36).slice(2, 8);

let admin: Awaited<ReturnType<typeof createAdminClient>>;
let slug: string;

beforeAll(async () => {
  admin = await createAdminClient();
});

async function makeSite(allowed: string[]): Promise<string> {
  const s = rand();
  await admin.collection('sites').create({
    name: 'Ingest Site',
    tracking_id: s,
    endpoint_slug: s,
    allowed_origins: allowed,
  });
  return s;
}

async function countRecords(siteId: string): Promise<number> {
  const list = await admin.collection('records').getList(1, 100, {
    filter: `site="${siteId}"`,
  });
  return list.totalItems;
}

function post(slug: string, body: unknown, origin?: string, fetchSite?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (origin) headers.Origin = origin;
  if (fetchSite) headers['Sec-Fetch-Site'] = fetchSite;
  return fetch(`${getPbUrl()}/t/${slug}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('ingest route', () => {
  it('creates a record on first view and marks new visitor', async () => {
    slug = await makeSite(['https://a.example']);
    const res = await post(slug, { visitor: 'v1', page: '/home', browser: 'Chrome' }, 'https://a.example');
    // Fire-and-forget beacon → empty 204 (no JSON body, so ORB won't block it).
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');

    const records = await admin.collection('records').getList(1, 10, {
      filter: `visitor_id="v1"`,
    });
    expect(records.totalItems).toBe(1);
    expect((records.items[0] as any).is_new_visitor).toBe(true);
    expect((records.items[0] as any).path).toBe('/home');

    // Second view from the same visitor → not new.
    await post(slug, { visitor: 'v1', page: '/about' }, 'https://a.example');
    const after = await admin.collection('records').getList(1, 10, {
      filter: `visitor_id="v1"`,
    });
    expect(after.totalItems).toBe(2);
  });

  it('404s on unknown slug and creates no record', async () => {
    const before = await admin.collection('records').getList(1, 1);
    const totalBefore = before.totalItems;
    const res = await post('nonexistent', { visitor: 'v9', page: '/' });
    expect(res.status).toBe(404);
    const after = await admin.collection('records').getList(1, 1);
    expect(after.totalItems).toBe(totalBefore);
  });

  it('enforces allowed_origins for Variant A', async () => {
    const s = await makeSite(['https://allowed.example']);
    // Disallowed origin → 403, no record.
    const bad = await post(s, { visitor: 'v-bad', page: '/' }, 'https://evil.example');
    expect(bad.status).toBe(403);

    // Allowed origin → 204, record created.
    const good = await post(s, { visitor: 'v-good', page: '/' }, 'https://allowed.example');
    expect(good.status).toBe(204);
    const records = await admin.collection('records').getList(1, 10, {
      filter: `visitor_id="v-good"`,
    });
    expect(records.totalItems).toBe(1);
  });

  it('rejects Variant B with no browser signal (curl/wget bypass)', async () => {
    const s = await makeSite([]);
    // No Origin AND no Sec-Fetch-Site → looks like a non-browser client.
    const res = await post(s, { visitor: 'vb-curl', page: '/' });
    expect(res.status).toBe(403);
    const records = await admin.collection('records').getList(1, 10, {
      filter: `visitor_id="vb-curl"`,
    });
    expect(records.totalItems).toBe(0);
  });

  it('allows Variant B (no Origin + Sec-Fetch-Site) and applies duration on "end"', async () => {
    const s = await makeSite([]);
    // A view with no Origin but a same-origin browser beacon.
    const v = await post(s, { visitor: 'vb1', page: '/page1' }, undefined, 'same-origin');
    expect(v.status).toBe(204);

    // "end" carries the duration spent on /page1.
    const e = await post(s, { visitor: 'vb1', type: 'end', duration: 42 }, undefined, 'same-origin');
    expect(e.status).toBe(204);

    const records = await admin.collection('records').getList(1, 10, {
      filter: `visitor_id="vb1"`,
    });
    expect(records.totalItems).toBe(1);
    expect((records.items[0] as any).duration).toBe(42);
  });
});
