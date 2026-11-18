import { describe, it, expect, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  getOne: vi.fn(),
  update: vi.fn(),
  getFullList: vi.fn(),
}));

vi.mock('~/services/pocketbase', () => ({
  pb: {
    authStore: { model: { id: 'admin1' } },
    collection: () => ({ getOne: mock.getOne, update: mock.update, getFullList: mock.getFullList }),
  },
}));

import { adminStore, buildUserRows } from './admin';

describe('admin store', () => {
  it('setUserSiteRole promotes a user to manager without duplicating', async () => {
    mock.getOne.mockResolvedValueOnce({
      id: 'site1',
      managers: ['user1'],
      viewers: ['user2'],
    });
    mock.update.mockResolvedValueOnce({});

    await adminStore.setUserSiteRole('user2', 'site1', 'manager');

    expect(mock.update).toHaveBeenCalledWith('site1', {
      managers: ['user1', 'user2'],
      viewers: [],
    });
  });

  it('setUserSiteRole revokes when role is null', async () => {
    mock.getOne.mockResolvedValueOnce({ id: 'site1', managers: ['user1'], viewers: [] });
    mock.update.mockResolvedValueOnce({});

    await adminStore.setUserSiteRole('user1', 'site1', null);

    expect(mock.update).toHaveBeenCalledWith('site1', { managers: [], viewers: [] });
  });
});

describe('buildUserRows', () => {
  it('lists admins first with role admin, then regular users with role user', () => {
    const rows = buildUserRows(
      [
        { id: 'u1', email: 'b@example.com', name: 'B' },
        { id: 'u2', email: 'c@example.com' },
      ],
      [{ id: 'a1', email: 'admin@example.com' }],
    );

    expect(rows[0]).toEqual({
      id: 'a1',
      email: 'admin@example.com',
      name: '',
      role: 'admin',
      provider: null,
    });
    expect(rows.slice(1).map((r) => r.role)).toEqual(['user', 'user']);
  });

  it('marks users whose external auth provider is set as non-local', () => {
    const rows = buildUserRows(
      [
        { id: 'u1', email: 'local@example.com' },
        { id: 'u2', email: 'sso@example.com' },
      ],
      [],
      new Map([['u2', 'oidc']]),
    );

    expect(rows.find((r) => r.id === 'u1')?.provider).toBeNull();
    expect(rows.find((r) => r.id === 'u2')?.provider).toBe('oidc');
  });

  it('does not duplicate a user whose email matches an admin', () => {
    const rows = buildUserRows(
      [
        { id: 'u1', email: 'Admin@example.com', name: 'A' },
        { id: 'u2', email: 'b@example.com' },
      ],
      [{ id: 'a1', email: 'admin@example.com' }],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].role).toBe('admin');
    expect(rows[1].email).toBe('b@example.com');
    expect(rows[1].provider).toBeNull();
  });
});
