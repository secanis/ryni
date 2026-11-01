import { describe, it, expect, vi } from 'vitest';

const { mockStore } = vi.hoisted(() => ({
  mockStore: {
    isValid: false,
    model: null as unknown,
    isSuperuser: false,
    clear: vi.fn(),
    onChange: vi.fn(),
  },
}));

vi.mock('~/services/pocketbase', () => ({
  pb: {
    authStore: mockStore,
    collection: () => ({
      authWithPassword: vi.fn(),
      authRefresh: vi.fn(),
      authWithOAuth2: vi.fn(),
    }),
  },
}));

import { auth } from './auth';

describe('auth store', () => {
  it('is not authenticated when there is no user', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
  });

  it('signOut clears the session and user state', () => {
    auth.signOut();
    expect(mockStore.clear).toHaveBeenCalled();
    expect(auth.user()).toBeNull();
  });

  it('init marks ready when there is no stored session', async () => {
    mockStore.isValid = false;
    await auth.init();
    expect(auth.ready()).toBe(true);
  });
});
