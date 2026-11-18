import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'solid-js/web';

const mock = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('~/services/pocketbase', () => ({ pb: { send: mock.send, authStore: { token: 't' } } }));

import BackupPanel from './BackupPanel';

afterEach(() => {
  document.body.innerHTML = '';
  mock.send.mockReset();
});

describe('BackupPanel', () => {
  it('lists each backup with download, restore and delete actions', async () => {
    mock.send.mockResolvedValueOnce([
      { key: 'ryni_2026-11-18.zip', size: 2048, modified: '2026-11-18' },
    ]);

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => <BackupPanel />, host);

    await vi.waitFor(() => {
      expect(host.textContent).toContain('ryni_2026-11-18.zip');
    });

    const labels = [...host.querySelectorAll('button[aria-label]')].map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(labels).toContain('Download ryni_2026-11-18.zip');
    expect(labels).toContain('Restore ryni_2026-11-18.zip');
    expect(labels).toContain('Delete ryni_2026-11-18.zip');

    // Restore is destructive — the warning is always shown.
    expect(host.textContent).toContain('replaces the current database');
  });
});
