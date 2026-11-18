import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'solid-js/web';

const mock = vi.hoisted(() => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('~/stores/admin', () => ({
  adminStore: { createUser: mock.createUser, updateUser: mock.updateUser },
}));

import UserDialog from './UserDialog';

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

function mount(props: { mode: 'add' | 'edit'; user?: unknown; onClose?: () => void }) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <UserDialog {...(props as never)} />, host);
  return host;
}

function setInput(host: HTMLElement, label: string, value: string) {
  const input = [...host.querySelectorAll('input')].find(
    (i) => i.getAttribute('aria-label') === label,
  );
  if (!input) throw new Error(`no input with aria-label "${label}"`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickText(host: HTMLElement, text: string) {
  const btn = [...host.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(text),
  );
  if (!btn) throw new Error(`no button containing "${text}"`);
  btn.click();
}

describe('UserDialog (add)', () => {
  it('auto-generates a password and calls createUser with email/name/password', async () => {
    mock.createUser.mockResolvedValueOnce(undefined);
    const host = mount({ mode: 'add' });

    // A generated password is present from the start.
    const pw = host.querySelector('input[readonly]') as HTMLInputElement;
    expect(pw.value.length).toBeGreaterThanOrEqual(16);

    setInput(host, 'Email', 'a@b.c');
    setInput(host, 'Name', 'A');
    clickText(host, 'Create user');

    await vi.waitFor(() => {
      expect(mock.createUser).toHaveBeenCalledWith({
        email: 'a@b.c',
        name: 'A',
        password: expect.any(String),
      });
    });
  });

  it('shows the password once in a confirmation after a successful create', async () => {
    mock.createUser.mockResolvedValueOnce(undefined);
    const host = mount({ mode: 'add' });

    clickText(host, 'Create user');

    await vi.waitFor(() => {
      expect(host.textContent).toContain("won't be shown again");
    });
    expect(host.querySelector('button[aria-label="Copy"]')).toBeTruthy();
  });

  it('surfaces a duplicate-email error instead of crashing', async () => {
    mock.createUser.mockRejectedValueOnce({
      message: 'Failed to create record.',
      response: {
        data: { email: { code: 'validation_invalid_email', message: 'The email is invalid or already in use.' } },
      },
    });
    const host = mount({ mode: 'add' });

    clickText(host, 'Create user');

    await vi.waitFor(() => {
      expect(host.textContent).toContain('The email is invalid or already in use.');
    });
  });

  it('shows the password actually submitted, even if regenerated mid-request', async () => {
    let resolveCreate!: (v: void) => void;
    mock.createUser.mockReturnValueOnce(new Promise<void>((res) => { resolveCreate = res; }));
    const host = mount({ mode: 'add' });

    const original = (host.querySelector('input[readonly]') as HTMLInputElement).value;

    clickText(host, 'Create user');
    // Regenerate while the create request is still in flight.
    (host.querySelector('[aria-label="Regenerate password"]') as HTMLElement).click();
    resolveCreate();

    await vi.waitFor(() => expect(host.textContent).toContain("won't be shown again"));
    expect(host.textContent).toContain(original);
  });
});

describe('UserDialog (edit)', () => {
  it('prefills and calls updateUser with email/name only', async () => {
    mock.updateUser.mockResolvedValueOnce(undefined);
    const onClose = vi.fn();
    const host = mount({
      mode: 'edit',
      user: { id: 'u1', email: 'a@b.c', name: 'A', role: 'user', provider: null },
      onClose,
    });

    expect((host.querySelector('input[aria-label="Email"]') as HTMLInputElement).value).toBe(
      'a@b.c',
    );

    setInput(host, 'Name', 'A2');
    clickText(host, 'Save');

    await vi.waitFor(() => {
      expect(mock.updateUser).toHaveBeenCalledWith('u1', { email: 'a@b.c', name: 'A2' });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
