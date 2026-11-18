import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'solid-js/web';

const mock = vi.hoisted(() => ({ resetPassword: vi.fn() }));

vi.mock('~/stores/admin', () => ({ adminStore: { resetPassword: mock.resetPassword } }));

import ResetPasswordDialog from './ResetPasswordDialog';

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

const user = { id: 'u1', email: 'a@b.c', name: 'A', role: 'user' as const, provider: null };

function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <ResetPasswordDialog user={user} onClose={() => {}} />, host);
  return host;
}

function clickText(host: HTMLElement, text: string) {
  const btn = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  if (!btn) throw new Error(`no button containing "${text}"`);
  btn.click();
}

describe('ResetPasswordDialog', () => {
  it('generates a password and resets on confirm', async () => {
    mock.resetPassword.mockResolvedValueOnce(undefined);
    const host = mount();

    const pw = host.querySelector('input[readonly]') as HTMLInputElement;
    expect(pw.value.length).toBeGreaterThanOrEqual(16);

    clickText(host, 'Reset password');

    await vi.waitFor(() => {
      expect(mock.resetPassword).toHaveBeenCalledWith('u1', expect.any(String));
    });
  });

  it('shows the new password once after resetting', async () => {
    mock.resetPassword.mockResolvedValueOnce(undefined);
    const host = mount();

    clickText(host, 'Reset password');

    await vi.waitFor(() => {
      expect(host.textContent).toContain("won't be shown again");
    });
    expect(host.querySelector('button[aria-label="Copy"]')).toBeTruthy();
  });
});
