import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { pb } from '~/services/pocketbase';

// Fallback first-superuser creation. The primary path is the env-var
// bootstrap (PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD in entrypoint.sh);
// this page covers the case where the operator ran PB without them.

export default function Setup() {
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
      await pb.collection('_superusers').create({
        email: email(),
        password: password(),
        passwordConfirm: password(),
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} (If an admin already exists, set PB_SUPERUSER_* env vars and restart.)`
          : 'Setup failed',
      );
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
        <h1 class="text-2xl font-semibold">Set up RÝNI</h1>
        <p class="text-sm text-slate-500">Create the first admin account.</p>
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
            minLength={8}
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
          {busy() ? 'Creating…' : 'Create admin'}
        </button>
      </form>
    </div>
  );
}
