import { createSignal, Show } from 'solid-js';
import { auth } from '~/stores/auth';
import { pb } from '~/services/pocketbase';

// Superuser-only OIDC configuration. Saves to the backend route implemented
// by the OIDC hook (pb_hooks/oidc.pb.js).

export default function Oidc() {
  const [issuer, setIssuer] = createSignal('');
  const [clientId, setClientId] = createSignal('');
  const [clientSecret, setClientSecret] = createSignal('');
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
        body: { issuer: issuer(), clientId: clientId(), clientSecret: clientSecret() },
      });
      setMessage('OIDC provider saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save OIDC config');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="space-y-6 max-w-md">
      <h1 class="text-2xl font-semibold">OIDC / SSO</h1>

      <Show when={auth.isSuperuser()} fallback={<p class="text-slate-500">Admin only.</p>}>
        <form onSubmit={onSubmit} class="space-y-4">
          <div>
            <label for="issuer" class="block text-sm mb-1">
              Issuer URL
            </label>
            <input
              id="issuer"
              value={issuer()}
              onInput={(e) => setIssuer(e.currentTarget.value)}
              placeholder="https://auth.example.com"
              class="w-full border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
          <div>
            <label for="clientId" class="block text-sm mb-1">
              Client ID
            </label>
            <input
              id="clientId"
              value={clientId()}
              onInput={(e) => setClientId(e.currentTarget.value)}
              class="w-full border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
          <div>
            <label for="clientSecret" class="block text-sm mb-1">
              Client secret
            </label>
            <input
              id="clientSecret"
              type="password"
              value={clientSecret()}
              onInput={(e) => setClientSecret(e.currentTarget.value)}
              class="w-full border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
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
