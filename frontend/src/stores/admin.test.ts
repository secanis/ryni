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

import { adminStore } from './admin';

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
