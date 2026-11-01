import { describe, it, expect, beforeAll } from 'vitest';
import { createAdminClient, createUserClient } from './helpers/client';

const rand = () => Math.random().toString(36).slice(2, 8);

let admin: Awaited<ReturnType<typeof createAdminClient>>;
let owner: Awaited<ReturnType<typeof createUserClient>>;
let viewer: Awaited<ReturnType<typeof createUserClient>>;
let outsider: Awaited<ReturnType<typeof createUserClient>>;
let siteId: string;

beforeAll(async () => {
  admin = await createAdminClient();
  owner = await createUserClient('owner');
  viewer = await createUserClient('viewer');
  outsider = await createUserClient('outsider');
  const s = rand();
  const site = await owner.pb.collection('sites').create({
    name: 'Members Site',
    tracking_id: s,
    endpoint_slug: s,
    allowed_origins: [],
    created_by: owner.userId,
    managers: [owner.userId],
    viewers: [viewer.userId],
  });
  siteId = site.id;
});

describe('members route', () => {
  it('returns managers and viewers with email and name', async () => {
    const res = await owner.pb.send(`/api/ryni/sites/${siteId}/members`);
    expect(res.managers).toHaveLength(1);
    expect(res.managers[0]).toMatchObject({ id: owner.userId, email: owner.email });
    expect(res.viewers).toHaveLength(1);
    expect(res.viewers[0]).toMatchObject({ id: viewer.userId, email: viewer.email });
  });

  it('is reachable by a viewer of the site', async () => {
    const res = await viewer.pb.send(`/api/ryni/sites/${siteId}/members`);
    expect(res.managers).toHaveLength(1);
    expect(res.viewers).toHaveLength(1);
  });

  it('returns 403 for a non-member', async () => {
    await expect(outsider.pb.send(`/api/ryni/sites/${siteId}/members`)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('is reachable by the superuser', async () => {
    const res = await admin.send(`/api/ryni/sites/${siteId}/members`);
    expect(res.managers).toHaveLength(1);
  });
});
