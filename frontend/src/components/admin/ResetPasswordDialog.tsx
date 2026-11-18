import { createSignal, Show } from 'solid-js';
import { RefreshCw, X } from 'lucide-solid';
import { adminStore } from '~/stores/admin';
import { generatePassword } from '~/utils/password';
import { pbErrorMessage } from '~/utils/pbError';
import CopyButton from '~/components/ui/CopyButton';
import type { UserRow } from '~/stores/admin';

// Reset-password dialog for a local user (superuser only). Generates a new
// password, sets it on the user, and shows it exactly once. Destructive to
// the user's current password — no way for the admin to recover the old one.
export default function ResetPasswordDialog(props: { user: UserRow; onClose: () => void }) {
  const [password, setPassword] = createSignal(generatePassword());
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');
  // Non-empty once the reset succeeds — holds the one-time password.
  const [done, setDone] = createSignal('');

  async function reset() {
    setBusy(true);
    setError('');
    try {
      // Capture once — Regenerate can change password() mid-request, and the
      // confirmation must show what was actually set.
      const pw = password();
      await adminStore.resetPassword(props.user.id, pw);
      setDone(pw);
    } catch (err) {
      setError(pbErrorMessage(err, 'Failed to reset password'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      class="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto p-4"
      onClick={() => props.onClose()}
    >
      <div
        class="bg-surface rounded-radius-card shadow p-6 w-full max-w-md space-y-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-lg">Reset password</h2>
          <button onClick={() => props.onClose()} aria-label="Close" class="text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        <Show
          when={done()}
          fallback={
            <div class="space-y-4">
              <p class="text-sm text-muted">
                Reset the password for <span class="font-mono text-text">{props.user.email}</span>.
                This replaces the user's current password.
              </p>

              <div>
                <label class="block text-sm mb-1">New password</label>
                <div class="flex items-center gap-2">
                  <input
                    readOnly
                    value={password()}
                    class="w-full border border-border rounded-radius-sm px-3 py-2 bg-surface dark:bg-surface-2 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(generatePassword())}
                    aria-label="Regenerate password"
                    title="Regenerate"
                    class="inline-flex items-center gap-1 rounded-radius-sm border border-border px-2 py-2 text-sm hover:bg-surface-2"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <CopyButton text={password()} label="Copy" />
                </div>
              </div>

              {error() && <p class="text-danger text-sm">{error()}</p>}

              <div class="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => props.onClose()}
                  class="px-4 py-2 rounded-radius-sm border border-border text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void reset()}
                  disabled={busy()}
                  class="bg-accent text-accent-fg rounded-radius-sm px-4 py-2 text-sm disabled:opacity-50"
                >
                  {busy() ? 'Resetting…' : 'Reset password'}
                </button>
              </div>
            </div>
          }
        >
          <div class="space-y-4">
            <p class="text-sm">
              Password reset. Give this to the user — it won't be shown again.
            </p>
            <div class="flex items-center gap-2">
              <code class="font-mono text-sm break-all">{done()}</code>
              <CopyButton text={done()} label="Copy" />
            </div>
            <div class="flex justify-end">
              <button
                onClick={() => props.onClose()}
                class="bg-accent text-accent-fg rounded-radius-sm px-4 py-2 text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
