import { describe, it, expect, beforeAll } from 'vitest';
import { getPbUrl } from '../setup';
import { createAdminClient, createUserClient } from './helpers/client';

let admin: Awaited<ReturnType<typeof createAdminClient>>;
let user: Awaited<ReturnType<typeof createUserClient>>;

beforeAll(async () => {
  admin = await createAdminClient();
  user = await createUserClient('backup');
});

describe('backup API', () => {
  it('forbids non-superusers', async () => {
    const res = await fetch(`${getPbUrl()}/api/backups`, {
      headers: { Authorization: user.pb.authStore.token },
    });
    expect(res.status).toBe(403);
  });

  it('lists backups for a superuser', async () => {
    const res = await fetch(`${getPbUrl()}/api/backups`, {
      headers: { Authorization: admin.authStore.token },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('creates a backup for a superuser', async () => {
    const res = await fetch(`${getPbUrl()}/api/backups`, {
      method: 'POST',
      headers: {
        Authorization: admin.authStore.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'ryni_test_backup.zip' }),
    });
    expect(res.status).toBeLessThan(400);
  });
});
