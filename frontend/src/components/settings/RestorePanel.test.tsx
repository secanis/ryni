import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'solid-js/web';

const mock = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('~/services/pocketbase', () => ({ pb: { send: mock.send } }));

import RestorePanel from './RestorePanel';

afterEach(() => {
  document.body.innerHTML = '';
  mock.send.mockReset();
});

describe('RestorePanel', () => {
  it('warns that restore overwrites live data and lists backups', async () => {
    mock.send.mockResolvedValueOnce([
      { key: 'ryni_2026-11-18.zip', size: 2048, modified: '2026-11-18' },
    ]);

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => <RestorePanel />, host);

    await vi.waitFor(() => {
      expect(host.textContent).toContain('ryni_2026-11-18.zip');
    });
    expect(host.textContent).toContain('replaces the current database');
  });
});
