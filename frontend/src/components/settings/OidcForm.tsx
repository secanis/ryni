import { createSignal, onMount } from 'solid-js';
import { pb } from '~/services/pocketbase';
import CopyButton from '~/components/ui/CopyButton';

// OIDC / SSO configuration form (superuser only — gated by the parent
// Settings page). Registers the "oidc" provider on the `users` collection
// via the backend route (pb_hooks/oidc.pb.js).
//
// The saved config is loaded on mount so the form reflects what is actually
// registered after a reload. The client secret is never returned by the API;
// an empty secret field on save keeps the stored one.

interface OidcConfig {
  configured?: boolean;
  enabled?: boolean;
  displayName?: string;
  clientId?: string;
  authUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  hasSecret?: boolean;
}

interface OidcResponse {
  ok?: boolean;
  config?: OidcConfig;
}

export default function OidcForm() {
  const [displayName, setDisplayName] = createSignal('OIDC');
  const [clientId, setClientId] = createSignal('');
  const [clientSecret, setClientSecret] = createSignal('');
  const [authUrl, setAuthUrl] = createSignal('');
  const [tokenUrl, setTokenUrl] = createSignal('');
  const [userInfoUrl, setUserInfoUrl] = createSignal('');
  const [hasSecret, setHasSecret] = createSignal(false);
  const [message, setMessage] = createSignal('');
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal(false);

  function applyConfig(cfg: OidcConfig | undefined) {
    if (!cfg) return;
    setDisplayName(cfg.displayName || 'OIDC');
    setClientId(cfg.clientId || '');
    setAuthUrl(cfg.authUrl || '');
    setTokenUrl(cfg.tokenUrl || '');
    setUserInfoUrl(cfg.userInfoUrl || '');
    setHasSecret(!!cfg.hasSecret);
  }

  onMount(async () => {
    try {
      const res = (await pb.send('/api/ryni/oidc', { method: 'GET' })) as OidcResponse;
      applyConfig(res?.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load OIDC config');
    }
  });

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      // Only send the secret when the admin entered a new one; an empty field
      // means "keep the stored secret".
      const body: Record<string, string> = {
        displayName: displayName(),
        clientId: clientId(),
        authUrl: authUrl(),
        tokenUrl: tokenUrl(),
        userInfoUrl: userInfoUrl(),
      };
      if (clientSecret()) body.clientSecret = clientSecret();

      const res = (await pb.send('/api/ryni/oidc', {
        method: 'POST',
        body,
      })) as OidcResponse;
      applyConfig(res?.config);
      setClientSecret('');
      setHasSecret(true);
      setMessage('OIDC provider saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save OIDC config');
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full border border-border rounded-radius-sm px-3 py-2 bg-surface dark:bg-surface-2';
  // The redirect URI the identity provider must allow. PocketBase's OAuth2
  // flow returns to this exact path (the SDK opens the popup with it).
  const callbackUrl = () => pb.buildURL('/api/oauth2-redirect');

  return (
    <form onSubmit={onSubmit} class="space-y-4 max-w-md">
      <div class="rounded-radius-sm border border-border bg-surface-2 p-3 text-xs">
        <p class="mb-1.5 text-muted">Redirect / callback URL to add in your identity provider:</p>
        <div class="flex items-center gap-2">
          <code class="font-mono text-text break-all">{callbackUrl()}</code>
          <CopyButton text={callbackUrl()} label="Copy callback URL" />
        </div>
      </div>
      <div>
        <label class="block text-sm mb-1">Display name</label>
        <input value={displayName()} onInput={(e) => setDisplayName(e.currentTarget.value)} class={field} />
      </div>
      <div>
        <label class="block text-sm mb-1">Client ID</label>
        <input value={clientId()} onInput={(e) => setClientId(e.currentTarget.value)} class={field} required />
      </div>
      <div>
        <label class="block text-sm mb-1">Client secret</label>
        <input
          type="password"
          autocomplete="off"
          value={clientSecret()}
          onInput={(e) => setClientSecret(e.currentTarget.value)}
          placeholder={hasSecret() ? 'Stored — leave blank to keep' : ''}
          class={field}
          required={!hasSecret()}
        />
      </div>
      <div>
        <label class="block text-sm mb-1">Authorization URL</label>
        <input
          value={authUrl()}
          onInput={(e) => setAuthUrl(e.currentTarget.value)}
          placeholder="https://auth.example.com/realms/x/protocol/openid-connect/auth"
          class={field}
          required
        />
      </div>
      <div>
        <label class="block text-sm mb-1">Token URL</label>
        <input
          value={tokenUrl()}
          onInput={(e) => setTokenUrl(e.currentTarget.value)}
          placeholder="https://auth.example.com/realms/x/protocol/openid-connect/token"
          class={field}
          required
        />
      </div>
      <div>
        <label class="block text-sm mb-1">User info URL</label>
        <input
          value={userInfoUrl()}
          onInput={(e) => setUserInfoUrl(e.currentTarget.value)}
          placeholder="https://auth.example.com/realms/x/protocol/openid-connect/userinfo"
          class={field}
          required
        />
      </div>
      {error() && <p class="text-danger text-sm">{error()}</p>}
      {message() && <p class="text-accent text-sm">{message()}</p>}
      <button
        type="submit"
        disabled={busy()}
        class="bg-accent text-accent-fg rounded-radius-sm px-4 py-2 disabled:opacity-50"
      >
        {busy() ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
