import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import OidcForm from './OidcForm';

function renderForm() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <OidcForm />, host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('OidcForm', () => {
  it('shows the OAuth2 callback URL to configure in the identity provider', () => {
    const host = renderForm();
    expect(host.textContent).toContain('/api/oauth2-redirect');
  });

  it('does not let the browser autofill the client secret', () => {
    const host = renderForm();
    const secret = host.querySelector('input[type="password"]');
    expect(secret?.getAttribute('autocomplete')).toBe('off');
  });
});
