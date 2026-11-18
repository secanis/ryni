import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'solid-js/web';

const mocks = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  loadUsers: vi.fn(),
  loadSites: vi.fn(),
  rows: [
    { id: 'u1', email: 'local@a.b', name: 'Local', role: 'user', provider: null },
    { id: 'u2', email: 'sso@a.b', name: 'SSO', role: 'user', provider: 'oidc' },
    { id: 'a1', email: 'admin@a.b', name: 'Admin', role: 'admin', provider: null },
  ] as Array<{
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    provider: string | null;
  }>,
}));

vi.mock('~/stores/auth', () => ({ auth: { isSuperuser: () => true } }));

vi.mock('~/stores/admin', () => ({
  adminStore: {
    users: () => mocks.rows,
    allSites: () => [],
    roleOn: () => null,
    loadUsers: mocks.loadUsers,
    loadSites: mocks.loadSites,
    deleteUser: mocks.deleteUser,
  },
}));

import Users from './Users';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  mocks.deleteUser.mockReset();
});

function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <Users />, host);
  return host;
}

function labels(host: HTMLElement): string[] {
  return [...host.querySelectorAll('[aria-label]')].map((b) => b.getAttribute('aria-label') ?? '');
}

describe('Users', () => {
  it('offers an Add user button', () => {
    const host = mount();
    expect(host.textContent).toContain('Add user');
  });

  it('shows edit/reset/delete actions only on local rows', () => {
    const host = mount();
    const all = labels(host);

    expect(all).toContain('Edit local@a.b');
    expect(all).toContain('Reset password for local@a.b');
    expect(all).toContain('Delete local@a.b');

    // OIDC + admin rows: no actions.
    expect(all).not.toContain('Edit sso@a.b');
    expect(all).not.toContain('Reset password for sso@a.b');
    expect(all).not.toContain('Delete sso@a.b');
    expect(all).not.toContain('Edit admin@a.b');
    expect(all).not.toContain('Delete admin@a.b');
  });

  it('does not delete when the user cancels the confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const host = mount();

    const del = [...host.querySelectorAll('[aria-label]')].find(
      (b) => b.getAttribute('aria-label') === 'Delete local@a.b',
    ) as HTMLElement;
    del.click();

    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
