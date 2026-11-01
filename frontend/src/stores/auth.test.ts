import { describe, it, expect, vi } from 'vitest';
import { ClientResponseError } from 'pocketbase';

const mocks = vi.hoisted(() => {
  const usersAuth = vi.fn();
  const superAuth = vi.fn();
  const collection = vi.fn((name: string) => ({
    authWithPassword: name === '_superusers' ? superAuth : usersAuth,
    authRefresh: vi.fn(),
    authWithOAuth2: vi.fn(),
  }));
  const store = {
    isValid: false,
    model: null as unknown,
    isSuperuser: false,
    clear: vi.fn(),
    onChange: vi.fn(),
  };
  return { usersAuth, superAuth, collection, store };
});

vi.mock('~/services/pocketbase', () => ({
  pb: {
    authStore: mocks.store,
    collection: mocks.collection,
  },
}));

import { auth } from './auth';

function clientError(status: number): ClientResponseError {
  return new ClientResponseError({
    url: 'http://test/api',
    status,
    response: { message: 'fail', code: status, data: {} },
  });
}

describe('auth store', () => {
  it('is not authenticated when there is no user', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
  });

  it('signOut clears the session and user state', () => {
    auth.signOut();
    expect(mocks.store.clear).toHaveBeenCalled();
    expect(auth.user()).toBeNull();
  });

  it('init marks ready when there is no stored session', async () => {
    mocks.store.isValid = false;
    await auth.init();
    expect(auth.ready()).toBe(true);
  });

  it('signIn authenticates a regular user', async () => {
    mocks.usersAuth.mockResolvedValueOnce({});
    await auth.signIn('user@example.com', 'pw');
    expect(mocks.usersAuth).toHaveBeenCalledWith('user@example.com', 'pw');
    expect(mocks.superAuth).not.toHaveBeenCalled();
  });

  it('signIn falls back to _superusers when users auth fails', async () => {
    mocks.usersAuth.mockRejectedValueOnce(clientError(400));
    mocks.superAuth.mockResolvedValueOnce({});
    await auth.signIn('admin@example.com', 'pw');
    expect(mocks.superAuth).toHaveBeenCalledWith('admin@example.com', 'pw');
  });

  it('signIn does not fall back on a non-credential error', async () => {
    mocks.usersAuth.mockRejectedValueOnce(new Error('network down'));
    await expect(auth.signIn('user@example.com', 'pw')).rejects.toThrow('network down');
    expect(mocks.superAuth).not.toHaveBeenCalled();
  });
});
