import { createSignal, Show } from 'solid-js';
import { auth } from '~/stores/auth';
import { pb } from '~/services/pocketbase';

// Superuser-only OIDC configuration. Registers the "oidc" provider on the
// `users` collection via the backend route (pb_hooks/oidc.pb.js).

export default function Oidc() {
  const [displayName, setDisplayName] = createSignal('OIDC');
  const [clientId, setClientId] = createSignal('');
  const [clientSecret, setClientSecret] = createSignal('');
  const [authUrl, setAuthUrl] = createSignal('');
  const [tokenUrl, setTokenUrl] = createSignal('');
  const [userInfoUrl, setUserInfoUrl] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal(false);

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await pb.send('/api/ryni/oidc', {
        method: 'POST',
        body: {
          displayName: displayName(),
          clientId: clientId(),
          clientSecret: clientSecret(),
          authUrl: authUrl(),
          tokenUrl: tokenUrl(),
          userInfoUrl: userInfoUrl(),
        },
      });
      setMessage('OIDC provider saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save OIDC config');
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700';

  return (
    <div class="space-y-6 max-w-md">
      <h1 class="text-2xl font-semibold">OIDC / SSO</h1>

      <Show when={auth.isSuperuser()} fallback={<p class="text-slate-500">Admin only.</p>}>
        <form onSubmit={onSubmit} class="space-y-4">
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
              value={clientSecret()}
              onInput={(e) => setClientSecret(e.currentTarget.value)}
              class={field}
              required
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
          {error() && <p class="text-red-500 text-sm">{error()}</p>}
          {message() && <p class="text-green-600 text-sm">{message()}</p>}
          <button
            type="submit"
            disabled={busy()}
            class="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded px-4 py-2 disabled:opacity-50"
          >
            {busy() ? 'Saving…' : 'Save'}
          </button>
        </form>
      </Show>
    </div>
  );
}
