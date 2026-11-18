import { createSignal, Show, untrack } from 'solid-js';
import { RefreshCw, X } from 'lucide-solid';
import { adminStore } from '~/stores/admin';
import { generatePassword } from '~/utils/password';
import { pbErrorMessage } from '~/utils/pbError';
import CopyButton from '~/components/ui/CopyButton';
import type { UserRow } from '~/stores/admin';

// Add / edit dialog for a local user (superuser only — gated by the parent
// Users page). Add mode generates an initial password and shows it exactly
// once after a successful create; edit mode changes name + email only.
export default function UserDialog(props: {
  mode: 'add' | 'edit';
  user?: UserRow;
  onClose: () => void;
}) {
  const isAdd = () => props.mode === 'add';
  const [email, setEmail] = createSignal(untrack(() => props.user?.email ?? ''));
  const [name, setName] = createSignal(untrack(() => props.user?.name ?? ''));
  const [password, setPassword] = createSignal(untrack(() => generatePassword()));
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');
  // Non-empty once a user is created — holds the one-time password to display.
  const [created, setCreated] = createSignal('');

  const field =
    'w-full border border-border rounded-radius-sm px-3 py-2 bg-surface dark:bg-surface-2';

  async function submit() {
    setBusy(true);
    setError('');
    try {
      if (isAdd()) {
        // Capture once — Regenerate can change password() while the request
        // is in flight, and the confirmation must show what was actually sent.
        const pw = password();
        await adminStore.createUser({
          email: email().trim(),
          name: name().trim(),
          password: pw,
        });
        setCreated(pw);
      } else {
        await adminStore.updateUser(props.user!.id, {
          email: email().trim(),
          name: name().trim(),
        });
        props.onClose();
      }
    } catch (err) {
      setError(pbErrorMessage(err, 'Failed to save user'));
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
          <h2 class="font-semibold text-lg">{isAdd() ? 'Add user' : 'Edit user'}</h2>
          <button onClick={() => props.onClose()} aria-label="Close" class="text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        <Show when={created()} fallback={
          <div class="space-y-4">
            <div>
              <label for="user-email" class="block text-sm mb-1">
                Email
              </label>
              <input
                id="user-email"
                aria-label="Email"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                class={field}
              />
            </div>
            <div>
              <label for="user-name" class="block text-sm mb-1">
                Name
              </label>
              <input
                id="user-name"
                aria-label="Name"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                class={field}
              />
            </div>

            <Show when={isAdd()}>
              <div>
                <label class="block text-sm mb-1">Initial password</label>
                <div class="flex items-center gap-2">
                  <input readOnly value={password()} class={`${field} font-mono`} />
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
            </Show>

            {error() && <p class="text-danger text-sm">{error()}</p>}

            <div class="flex justify-end gap-2 pt-2">
              <button
                onClick={() => props.onClose()}
                class="px-4 py-2 rounded-radius-sm border border-border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void submit()}
                disabled={busy()}
                class="bg-accent text-accent-fg rounded-radius-sm px-4 py-2 text-sm disabled:opacity-50"
              >
                {busy() ? 'Saving…' : isAdd() ? 'Create user' : 'Save'}
              </button>
            </div>
          </div>
        }>
          <div class="space-y-4">
            <p class="text-sm">
              User created. Give them this password — it won't be shown again.
            </p>
            <div class="flex items-center gap-2">
              <code class="font-mono text-sm break-all">{created()}</code>
              <CopyButton text={created()} label="Copy" />
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
