import { describe, it, expect } from 'vitest';
import { createAdminClient, createUserClient } from './helpers/client';

const rand = () => Math.random().toString(36).slice(2, 8);

function expectRejected(promise: Promise<unknown>, status: number): Promise<void> {
  return promise.then(
    () => {
      throw new Error(`expected rejection with status ${status}, but resolved`);
    },
    (err) => {
      expect(err?.status || err?.response?.status || err?.code).toBe(status);
    },
  );
}

describe('collections', () => {
  it('creates sites, records, heartbeats with the expected fields', async () => {
    const admin = await createAdminClient();

    const sites = await admin.collections.getOne('sites');
    const siteFields = sites.fields.map((f: any) => f.name);
    for (const f of ['name', 'tracking_id', 'allowed_origins', 'endpoint_slug', 'created_by', 'managers', 'viewers']) {
      expect(siteFields).toContain(f);
    }

    const records = await admin.collections.getOne('records');
    const recordFields = records.fields.map((f: any) => f.name);
    for (const f of ['site', 'visitor_id', 'path', 'referrer', 'browser', 'os', 'device', 'screen_size', 'duration', 'is_new_visitor']) {
      expect(recordFields).toContain(f);
    }

    const heartbeats = await admin.collections.getOne('heartbeats');
    const hbFields = heartbeats.fields.map((f: any) => f.name);
    for (const f of ['site', 'visitor_id', 'last_seen']) {
      expect(hbFields).toContain(f);
    }

    const users = await admin.collections.getOne('users');
    expect(users.fields.map((f: any) => f.name)).toContain('name');
  });

  it('enforces per-site visibility: member sees it, stranger does not', async () => {
    const a = await createUserClient('a');
    const b = await createUserClient('b');

    const trackingId = rand();
    const site = await a.pb.collection('sites').create({
      name: 'Site A',
      tracking_id: trackingId,
      endpoint_slug: trackingId,
      allowed_origins: ['https://a.example'],
      created_by: a.userId,
    });

    // A (creator) sees it.
    const aList = await a.pb.collection('sites').getList(1, 50);
    expect(aList.items.map((r: any) => r.id)).toContain(site.id);

    // B (stranger) does not see it in the list.
    const bList = await b.pb.collection('sites').getList(1, 50);
    expect(bList.items.map((r: any) => r.id)).not.toContain(site.id);

    // B cannot fetch it directly.
    await expectRejected(b.pb.collection('sites').getOne(site.id), 404);

    // B cannot update it.
    await expectRejected(b.pb.collection('sites').update(site.id, { name: 'Hacked' }), 404);
  });

  it('lets a manager share a site as viewer; viewer can read but not write', async () => {
    const a = await createUserClient('a');
    const b = await createUserClient('b');

    const trackingId = rand();
    const site = await a.pb.collection('sites').create({
      name: 'Shared',
      tracking_id: trackingId,
      endpoint_slug: trackingId,
      allowed_origins: [],
      created_by: a.userId,
    });

    // A shares with B as viewer.
    await a.pb.collection('sites').update(site.id, { viewers: [b.userId] });

    // B can now view it.
    const viewed = await b.pb.collection('sites').getOne(site.id);
    expect(viewed.id).toBe(site.id);

    // B (viewer) still cannot update it.
    await expectRejected(b.pb.collection('sites').update(site.id, { name: 'Nope' }), 404);
  });

  it('rejects duplicate tracking_id and endpoint_slug', async () => {
    const a = await createUserClient('a');
    const trackingId = rand();

    await a.pb.collection('sites').create({
      name: 'One',
      tracking_id: trackingId,
      endpoint_slug: trackingId,
      allowed_origins: [],
      created_by: a.userId,
    });

    await expectRejected(
      a.pb.collection('sites').create({
        name: 'Two',
        tracking_id: trackingId,
        endpoint_slug: rand(),
        allowed_origins: [],
        created_by: a.userId,
      }),
      400,
    );
  });

  it('blocks regular users from records and heartbeats (rules null)', async () => {
    const a = await createUserClient('a');

    // records: all rules null → non-superuser create is forbidden.
    await expectRejected(
      a.pb.collection('records').create({
        site: 'invalid',
        visitor_id: 'v1',
        path: '/',
      }),
      403,
    );

    await expectRejected(a.pb.collection('heartbeats').create({ site: 'x', visitor_id: 'v' }), 403);
  });

  describe('privacy settings fields', () => {
    it('exposes tracking_mode and disclosure_mode with the allowed values', async () => {
      const admin = await createAdminClient();
      const sites = await admin.collections.getOne('sites');
      const byName = new Map<string, any>(sites.fields.map((f: any) => [f.name, f]));

      const tracking = byName.get('tracking_mode');
      expect(tracking).toBeTruthy();
      expect(tracking.required).toBeFalsy();
      expect(tracking.maxSelect).toBe(1);
      expect(tracking.values).toEqual(['standard', 'session', 'minimal']);

      const disclosure = byName.get('disclosure_mode');
      expect(disclosure).toBeTruthy();
      expect(disclosure.required).toBeFalsy();
      expect(disclosure.maxSelect).toBe(1);
      expect(disclosure.values).toEqual(['none', 'text', 'banner']);
    });

    it('stores tracking_mode = minimal on create and reads it back', async () => {
      const tracked = await createUserClient('privacy-mode');
      const trackingId = rand();
      const site = await tracked.pb.collection('sites').create({
        name: 'Minimal Site',
        tracking_id: trackingId,
        endpoint_slug: trackingId,
        allowed_origins: [],
        created_by: tracked.userId,
        tracking_mode: 'minimal',
        disclosure_mode: 'banner',
      });

      const fetched = await tracked.pb.collection('sites').getOne(site.id);
      expect(fetched.tracking_mode).toBe('minimal');
      expect(fetched.disclosure_mode).toBe('banner');
    });

    it('allows a site without tracking_mode (field stays empty)', async () => {
      const plain = await createUserClient('privacy-empty');
      const trackingId = rand();
      const site = await plain.pb.collection('sites').create({
        name: 'Plain Site',
        tracking_id: trackingId,
        endpoint_slug: trackingId,
        allowed_origins: [],
        created_by: plain.userId,
      });
      expect(site.id).toBeTruthy();

      const fetched = await plain.pb.collection('sites').getOne(site.id);
      expect(fetched.tracking_mode || '').toBe('');
      expect(fetched.disclosure_mode || '').toBe('');
    });

    it('rejects an unknown tracking_mode value', async () => {
      const user = await createUserClient('privacy-bad');
      const trackingId = rand();
      await expectRejected(
        user.pb.collection('sites').create({
          name: 'Bad Site',
          tracking_id: trackingId,
          endpoint_slug: trackingId,
          allowed_origins: [],
          created_by: user.userId,
          tracking_mode: 'everything',
        }),
        400,
      );
    });

    it('rejects an unknown disclosure_mode value', async () => {
      const user = await createUserClient('disclosure-bad');
      const trackingId = rand();
      await expectRejected(
        user.pb.collection('sites').create({
          name: 'Bad Disclosure Site',
          tracking_id: trackingId,
          endpoint_slug: trackingId,
          allowed_origins: [],
          created_by: user.userId,
          disclosure_mode: 'everything',
        }),
        400,
      );
    });
  });

  it('lets a superuser create a site (created_by is a plain marker, not a relation)', async () => {
    const admin = await createAdminClient();
    const trackingId = rand();
    const site = await admin.collection('sites').create({
      name: 'Super Site',
      tracking_id: trackingId,
      endpoint_slug: trackingId,
      allowed_origins: [],
      created_by: admin.authStore.model?.id,
    });
    expect(site.id).toBeTruthy();
  });

  describe('labels field', () => {
    it('exposes an optional labels JSON field on sites', async () => {
      const admin = await createAdminClient();
      const sites = await admin.collections.getOne('sites');
      const labels = sites.fields.find((f: any) => f.name === 'labels');
      expect(labels).toBeTruthy();
      expect(labels.type).toBe('json');
      expect(labels.required).toBeFalsy();
    });

    it('stores and reads back a labels array', async () => {
      const user = await createUserClient('labels-store');
      const trackingId = rand();
      const site = await user.pb.collection('sites').create({
        name: 'Labeled Site',
        tracking_id: trackingId,
        endpoint_slug: trackingId,
        allowed_origins: [],
        created_by: user.userId,
        labels: ['production', 'customer-acme'],
      });
      const fetched = await user.pb.collection('sites').getOne(site.id);
      expect(fetched.labels).toEqual(['production', 'customer-acme']);
    });
  });
});
