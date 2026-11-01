import { describe, it, expect, beforeAll } from 'vitest';
import { getPbUrl } from '../setup';
import { createAdminClient, createUserClient } from './helpers/client';

let admin: Awaited<ReturnType<typeof createAdminClient>>;
let user: Awaited<ReturnType<typeof createUserClient>>;

const validBody = {
  displayName: 'SSO',
  clientId: 'client-123',
  clientSecret: 'secret-456',
  authUrl: 'https://auth.example.com/protocol/openid-connect/auth',
  tokenUrl: 'https://auth.example.com/protocol/openid-connect/token',
  userInfoUrl: 'https://auth.example.com/protocol/openid-connect/userinfo',
};

beforeAll(async () => {
  admin = await createAdminClient();
  user = await createUserClient('oidc');
});

describe('oidc route', () => {
  it('forbids non-superusers', async () => {
    const res = await fetch(`${getPbUrl()}/api/ryni/oidc`, {
      method: 'POST',
      headers: { Authorization: user.pb.authStore.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it('registers the oidc provider for a superuser', async () => {
    const res = await fetch(`${getPbUrl()}/api/ryni/oidc`, {
      method: 'POST',
      headers: { Authorization: admin.authStore.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(200);

    const users = await admin.collections.getOne('users');
    const oauth2 = (users as unknown as { oauth2?: { enabled: boolean; providers: { name: string }[] } }).oauth2;
    expect(oauth2?.enabled).toBe(true);
    expect(oauth2?.providers.some((p) => p.name === 'oidc')).toBe(true);
  });

  it('rejects a missing required field', async () => {
    const res = await fetch(`${getPbUrl()}/api/ryni/oidc`, {
      method: 'POST',
      headers: { Authorization: admin.authStore.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 'x' }),
    });
    expect(res.status).toBe(400);
  });
});
