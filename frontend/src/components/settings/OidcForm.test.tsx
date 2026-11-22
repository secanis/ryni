import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'solid-js/web';

const mock = vi.hoisted(() => ({
  send: vi.fn(),
  buildURL: vi.fn((path: string) => `http://pb.test${path}`),
}));

vi.mock('~/services/pocketbase', () => ({
  pb: { send: mock.send, buildURL: mock.buildURL },
}));

import OidcForm from './OidcForm';

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <OidcForm />, host);
  return host;
}

function inputByLabel(host: HTMLElement, label: string): HTMLInputElement {
  const inputs = [...host.querySelectorAll('input')];
  const el = inputs.find((i) => {
    const wrapper = i.closest('div');
    return wrapper?.textContent?.includes(label);
  });
  if (!el) throw new Error(`no input for label "${label}"`);
  return el as HTMLInputElement;
}

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function submit(host: HTMLElement) {
  host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

const savedConfig = {
  ok: true,
  config: {
    configured: true,
    enabled: true,
    displayName: 'Company SSO',
    clientId: 'saved-client-id',
    authUrl: 'https://idp.example.com/auth',
    tokenUrl: 'https://idp.example.com/token',
    userInfoUrl: 'https://idp.example.com/userinfo',
    hasSecret: true,
  },
};

describe('OidcForm', () => {
  it('shows the OAuth2 callback URL to configure in the identity provider', () => {
    mock.send.mockResolvedValue({ ok: true, config: { configured: false } });
    const host = mount();
    expect(host.textContent).toContain('/api/oauth2-redirect');
  });

  it('does not let the browser autofill the client secret', () => {
    mock.send.mockResolvedValue({ ok: true, config: { configured: false } });
    const host = mount();
    const secret = host.querySelector('input[type="password"]');
    expect(secret?.getAttribute('autocomplete')).toBe('off');
  });

  it('loads the saved config so it survives a page reload', async () => {
    mock.send.mockResolvedValue(savedConfig);
    const host = mount();

    await vi.waitFor(() => {
      expect(inputByLabel(host, 'Client ID').value).toBe('saved-client-id');
    });
    expect(mock.send).toHaveBeenCalledWith('/api/ryni/oidc', { method: 'GET' });
    expect(inputByLabel(host, 'Display name').value).toBe('Company SSO');
    expect(inputByLabel(host, 'Authorization URL').value).toBe('https://idp.example.com/auth');
    expect(inputByLabel(host, 'Token URL').value).toBe('https://idp.example.com/token');
    expect(inputByLabel(host, 'User info URL').value).toBe('https://idp.example.com/userinfo');
  });

  it('keeps the stored secret when the secret field is left blank', async () => {
    mock.send.mockResolvedValue(savedConfig);
    const host = mount();
    await vi.waitFor(() => {
      expect(inputByLabel(host, 'Client ID').value).toBe('saved-client-id');
    });

    submit(host);

    await vi.waitFor(() => {
      expect(mock.send).toHaveBeenCalledWith('/api/ryni/oidc', {
        method: 'POST',
        body: {
          displayName: 'Company SSO',
          clientId: 'saved-client-id',
          authUrl: 'https://idp.example.com/auth',
          tokenUrl: 'https://idp.example.com/token',
          userInfoUrl: 'https://idp.example.com/userinfo',
        },
      });
    });
  });

  it('sends a new secret when one is entered', async () => {
    mock.send.mockResolvedValue(savedConfig);
    const host = mount();
    await vi.waitFor(() => {
      expect(inputByLabel(host, 'Client ID').value).toBe('saved-client-id');
    });

    setValue(inputByLabel(host, 'Client secret'), 'new-secret');
    submit(host);

    await vi.waitFor(() => {
      const post = mock.send.mock.calls.find((c) => c[1]?.method === 'POST');
      expect(post?.[1]?.body?.clientSecret).toBe('new-secret');
    });
  });
});
