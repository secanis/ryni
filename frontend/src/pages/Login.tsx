import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { auth } from '~/stores/auth';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal(false);

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

  return (
    <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <form
        onSubmit={onSubmit}
        class="w-full max-w-sm p-8 bg-white dark:bg-slate-900 rounded-lg shadow space-y-4"
      >
        <h1 class="text-2xl font-semibold">RÝNI</h1>
        <div>
          <label for="email" class="block text-sm mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            class="w-full border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
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
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            class="w-full border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
            required
          />
        </div>
        {error() && <p class="text-red-500 text-sm">{error()}</p>}
        <button
          type="submit"
          disabled={busy()}
          class="w-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded px-3 py-2 disabled:opacity-50"
        >
          {busy() ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
