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

async function post(body: unknown, token = admin.authStore.token) {
  return fetch(`${getPbUrl()}/api/ryni/oidc`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function get(token = admin.authStore.token) {
  return fetch(`${getPbUrl()}/api/ryni/oidc`, {
    headers: { Authorization: token },
  });
}

beforeAll(async () => {
  admin = await createAdminClient();
  user = await createUserClient('oidc');
});

describe('oidc route', () => {
  it('forbids non-superusers', async () => {
    const res = await post(validBody, user.pb.authStore.token);
    expect(res.status).toBe(403);
  });

  it('forbids non-superusers from reading the config', async () => {
    const res = await get(user.pb.authStore.token);
    expect(res.status).toBe(403);
  });

  it('requires a client secret on first setup', async () => {
    const res = await post({ ...validBody, clientSecret: '' });
    expect(res.status).toBe(400);
  });

  it('registers the oidc provider for a superuser', async () => {
    const res = await post(validBody);
    expect(res.status).toBe(200);

    const users = await admin.collections.getOne('users');
    const oauth2 = (users as unknown as { oauth2?: { enabled: boolean; providers: { name: string }[] } }).oauth2;
    expect(oauth2?.enabled).toBe(true);
    expect(oauth2?.providers.some((p) => p.name === 'oidc')).toBe(true);
  });

  it('returns the saved config without exposing the client secret', async () => {
    const res = await get();
    expect(res.status).toBe(200);

    const body = (await res.json()) as { config?: Record<string, unknown> };
    expect(body.config?.clientId).toBe(validBody.clientId);
    expect(body.config?.authUrl).toBe(validBody.authUrl);
    expect(body.config?.tokenUrl).toBe(validBody.tokenUrl);
    expect(body.config?.userInfoUrl).toBe(validBody.userInfoUrl);
    expect(body.config?.displayName).toBe(validBody.displayName);
    expect(body.config?.hasSecret).toBe(true);
    expect(body.config).not.toHaveProperty('clientSecret');
  });

  it('keeps the existing secret when updating without one', async () => {
    const res = await post({ ...validBody, clientId: 'client-updated', clientSecret: '' });
    expect(res.status).toBe(200);

    const body = (await (await get()).json()) as {
      config?: { clientId?: string; hasSecret?: boolean };
    };
    expect(body.config?.clientId).toBe('client-updated');
    expect(body.config?.hasSecret).toBe(true);
  });

  it('rejects a missing required field', async () => {
    const res = await post({ clientId: 'x' });
    expect(res.status).toBe(400);
  });
});
