import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'solid-js/web';

const mock = vi.hoisted(() => ({
  signIn: vi.fn(),
  signInWithOidc: vi.fn(),
  listAuthMethods: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('~/stores/auth', () => ({
  auth: { signIn: mock.signIn, signInWithOidc: mock.signInWithOidc },
}));

vi.mock('~/services/pocketbase', () => ({
  pb: { collection: () => ({ listAuthMethods: mock.listAuthMethods }) },
}));

vi.mock('@solidjs/router', () => ({ useNavigate: () => mock.navigate }));

import Login from './Login';

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <Login />, host);
  return host;
}

function ssoButton(host: HTMLElement) {
  return [...host.querySelectorAll('button')].find((b) =>
    /sign in with/i.test(b.textContent || ''),
  );
}

describe('Login', () => {
  it('offers SSO when the oidc provider is configured', async () => {
    mock.listAuthMethods.mockResolvedValue({
      oauth2: { enabled: true, providers: [{ name: 'oidc', displayName: 'Company SSO' }] },
    });
    const host = mount();

    await vi.waitFor(() => {
      expect(ssoButton(host)?.textContent).toContain('Company SSO');
    });

    ssoButton(host)?.click();
    await vi.waitFor(() => {
      expect(mock.signInWithOidc).toHaveBeenCalledTimes(1);
    });
    expect(mock.navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('hides SSO when oauth2 is disabled', async () => {
    mock.listAuthMethods.mockResolvedValue({ oauth2: { enabled: false, providers: [] } });
    const host = mount();

    await vi.waitFor(() => {
      expect(mock.listAuthMethods).toHaveBeenCalled();
    });
    expect(ssoButton(host)).toBeUndefined();
  });

  it('still allows local email/password login', () => {
    mock.listAuthMethods.mockResolvedValue({ oauth2: { enabled: false, providers: [] } });
    const host = mount();
    expect(host.querySelector('input[type="email"]')).not.toBeNull();
    expect(host.querySelector('input[type="password"]')).not.toBeNull();
  });
});
