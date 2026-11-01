import { describe, it, expect, beforeAll } from 'vitest';
import { createAdminClient, createUserClient } from './helpers/client';
import { getPbUrl } from '../setup';

let a: Awaited<ReturnType<typeof createUserClient>>;
let b: Awaited<ReturnType<typeof createUserClient>>;

beforeAll(async () => {
  await createAdminClient();
  a = await createUserClient('sa');
  b = await createUserClient('sb');
});

describe('users search route', () => {
  it('resolves a user by email for an authenticated caller', async () => {
    const res = await fetch(`${getPbUrl()}/api/ryni/users/search?q=${encodeURIComponent(b.email)}`, {
      headers: { Authorization: a.pb.authStore.token },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users.some((u: { email: string }) => u.email === b.email)).toBe(true);
  });

  it('returns 401 for an anonymous caller', async () => {
    const res = await fetch(`${getPbUrl()}/api/ryni/users/search?q=foo`);
    expect(res.status).toBe(401);
  });
});
