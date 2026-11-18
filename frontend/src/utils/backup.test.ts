import { describe, it, expect, vi } from 'vitest';

const mock = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('~/services/pocketbase', () => ({ pb: { send: mock.send } }));

import { deleteBackup, listBackups, restoreBackup, sizeLabel } from './backup';

describe('backup utils', () => {
  it('formats byte sizes', () => {
    expect(sizeLabel(512)).toBe('512 B');
    expect(sizeLabel(2048)).toBe('2.0 KB');
    expect(sizeLabel(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('lists backups from the API', async () => {
    mock.send.mockResolvedValueOnce([{ key: 'a.zip', size: 1, modified: 'x' }]);
    const result = await listBackups();
    expect(result).toEqual([{ key: 'a.zip', size: 1, modified: 'x' }]);
    expect(mock.send).toHaveBeenCalledWith('/api/backups', { method: 'GET' });
  });

  it('restores a backup through the restore endpoint', async () => {
    mock.send.mockResolvedValueOnce(undefined);
    await restoreBackup('a b.zip');
    expect(mock.send).toHaveBeenCalledWith('/api/backups/a%20b.zip/restore', { method: 'POST' });
  });

  it('deletes a backup', async () => {
    mock.send.mockResolvedValueOnce(undefined);
    await deleteBackup('a.zip');
    expect(mock.send).toHaveBeenCalledWith('/api/backups/a.zip', { method: 'DELETE' });
  });
});
