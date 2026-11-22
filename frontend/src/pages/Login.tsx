import { createSignal, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { auth } from '~/stores/auth';
import { pb } from '~/services/pocketbase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [ssoName, setSsoName] = createSignal<string | null>(null);
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal(false);

  // SSO discovery is best-effort: the local email/password login must keep
  // working even when the auth-methods endpoint is unreachable.
  onMount(async () => {
    try {
      const methods = await pb.collection('users').listAuthMethods();
      if (!methods.oauth2?.enabled) return;
      const provider = methods.oauth2.providers.find((p) => p.name === 'oidc');
      if (provider) setSsoName(provider.displayName || 'SSO');
    } catch {
      /* ignore — no SSO button */
    }
  });

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await auth.signIn(email(), password());
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSso() {
    setError('');
    setBusy(true);
    try {
      await auth.signInWithOidc();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSO login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-bg">
      <div class="w-full max-w-sm p-8 bg-surface rounded-radius-card shadow space-y-4">
        <form onSubmit={onSubmit} class="space-y-4">
          <h1 class="text-2xl font-semibold">RÝNI</h1>
          <div>
            <label for="email" class="block text-sm mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autocomplete="username"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              class="w-full border border-border rounded-radius-sm px-3 py-2 bg-surface dark:bg-surface-2"
              required
            />
          </div>
          <div>
            <label for="password" class="block text-sm mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autocomplete="current-password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class="w-full border border-border rounded-radius-sm px-3 py-2 bg-surface dark:bg-surface-2"
              required
            />
          </div>
          {error() && <p class="text-danger text-sm">{error()}</p>}
          <button
            type="submit"
            disabled={busy()}
            class="w-full bg-accent text-accent-fg rounded-radius-sm px-3 py-2 disabled:opacity-50"
          >
            {busy() ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <Show when={ssoName()}>
          <div class="flex items-center gap-3 text-xs text-muted">
            <span class="h-px flex-1 bg-border" />
            or
            <span class="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            onClick={onSso}
            disabled={busy()}
            class="w-full border border-border rounded-radius-sm px-3 py-2 text-text hover:bg-surface-2 disabled:opacity-50"
          >
            Sign in with {ssoName()}
          </button>
        </Show>
      </div>
    </div>
  );
}
