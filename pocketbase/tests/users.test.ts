import { describe, it, expect, beforeAll } from 'vitest';
import { createAdminClient, createUserClient } from './helpers/client';
import { getPbUrl } from '../setup';

const rand = () => Math.random().toString(36).slice(2, 8);

let admin: Awaited<ReturnType<typeof createAdminClient>>;
let manager: Awaited<ReturnType<typeof createUserClient>>;
let viewer: Awaited<ReturnType<typeof createUserClient>>;

beforeAll(async () => {
  admin = await createAdminClient();
  manager = await createUserClient('search-manager');
  viewer = await createUserClient('search-viewer');
  // Make `manager` a manager of a site, so the search route grants them.
  const s = rand();
  await manager.pb.collection('sites').create({
    name: 'Search Site',
    tracking_id: s,
    endpoint_slug: s,
    allowed_origins: [],
    created_by: manager.userId,
    managers: [manager.userId],
  });
});

function search(token: string, q: string) {
  return fetch(`${getPbUrl()}/api/ryni/users/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: token },
  });
}

describe('users search route', () => {
  it('resolves a user by exact email for a manager', async () => {
    const res = await search(manager.pb.authStore.token, viewer.email);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users.some((u: { email: string }) => u.email === viewer.email)).toBe(true);
  });

  it('resolves a user by exact email for the superuser', async () => {
    const res = await search(admin.authStore.token, viewer.email);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users.some((u: { email: string }) => u.email === viewer.email)).toBe(true);
  });

  it('rejects a plain (non-manager) user', async () => {
    const res = await search(viewer.pb.authStore.token, manager.email);
    expect(res.status).toBe(403);
  });

  it('returns 401 for an anonymous caller', async () => {
    const res = await fetch(`${getPbUrl()}/api/ryni/users/search?q=foo`);
    expect(res.status).toBe(401);
  });

  it('does not prefix-match (no directory enumeration)', async () => {
    // "user-search" is a prefix of several test emails; exact match → none.
    const res = await search(admin.authStore.token, 'user-search');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(0);
  });
});
