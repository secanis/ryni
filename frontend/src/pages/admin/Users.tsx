import { createSignal, For, onMount, Show } from 'solid-js';
import { KeyRound, Pencil, Trash2, UserPlus } from 'lucide-solid';
import { auth } from '~/stores/auth';
import { adminStore, type UserRow } from '~/stores/admin';
import UserDialog from '~/components/admin/UserDialog';
import ResetPasswordDialog from '~/components/admin/ResetPasswordDialog';

export default function Users() {
  const [showAdd, setShowAdd] = createSignal(false);
  const [editing, setEditing] = createSignal<UserRow | null>(null);
  const [resetting, setResetting] = createSignal<UserRow | null>(null);

  onMount(() => {
    if (auth.isSuperuser()) {
      void adminStore.loadUsers();
      void adminStore.loadSites();
    }
  });

  // Only local (password) users are manageable here — OIDC users are governed
  // by their IdP, and the admin row lives in `_superusers`.
  const isLocal = (u: UserRow) => u.role === 'user' && u.provider === null;

  function remove(u: UserRow) {
    if (!window.confirm(`Delete user "${u.email}"? This cannot be undone.`)) return;
    void adminStore.deleteUser(u.id);
  }

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold">Users</h1>
        <Show when={auth.isSuperuser()}>
          <button
            onClick={() => setShowAdd(true)}
            class="inline-flex items-center gap-1.5 bg-accent text-accent-fg rounded-radius-sm px-4 py-2 text-sm"
          >
            <UserPlus size={15} />
            Add user
          </button>
        </Show>
      </div>

      <Show when={auth.isSuperuser()} fallback={<p class="text-muted">Admin only.</p>}>
        <table class="w-full text-sm bg-surface rounded-radius-card border border-border">
          <thead>
            <tr class="text-left border-b border-border">
              <th class="p-3">Email</th>
              <th class="p-3">Name</th>
              <th class="p-3">Role</th>
              <th class="p-3">Login</th>
              <th class="p-3">Sites</th>
              <th class="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <For each={adminStore.users()}>
              {(u) => (
                <tr class="border-b border-border last:border-0">
                  <td class="p-3">{u.email}</td>
                  <td class="p-3">{u.name}</td>
                  <td class="p-3">
                    <span
                      class={
                        u.role === 'admin'
                          ? 'inline-block px-2 py-0.5 rounded-radius-pill text-xs font-medium bg-surface-2 text-accent-3'
                          : 'inline-block px-2 py-0.5 rounded-radius-pill text-xs bg-surface-2 text-muted'
                      }
                    >
                      {u.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td class="p-3">
                    <Show when={u.provider} fallback={<span class="text-xs text-muted">Local</span>}>
                      <span class="inline-block px-2 py-0.5 rounded-radius-pill text-xs font-medium bg-surface-2 text-accent-2">
                        {u.provider!.toUpperCase()}
                      </span>
                    </Show>
                  </td>
                  <td class="p-3">
                    <For each={adminStore.allSites()}>
                      {(site) => {
                        const role = () => adminStore.roleOn(u.id, site.id);
                        return (
                          <Show when={role()}>
                            <span class="inline-block mr-1 mb-1 px-2 py-0.5 bg-surface-2 rounded text-xs">
                              {site.name} ({role()})
                            </span>
                          </Show>
                        );
                      }}
                    </For>
                  </td>
                  <td class="p-3">
                    <Show when={isLocal(u)}>
                      <div class="flex items-center gap-3">
                        <button
                          onClick={() => setEditing(u)}
                          aria-label={`Edit ${u.email}`}
                          title="Edit"
                          class="text-muted hover:text-text transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setResetting(u)}
                          aria-label={`Reset password for ${u.email}`}
                          title="Reset password"
                          class="text-muted hover:text-text transition-colors"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => remove(u)}
                          aria-label={`Delete ${u.email}`}
                          title="Delete"
                          class="text-danger hover:opacity-70 transition-opacity"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </Show>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>

      <Show when={showAdd()}>
        <UserDialog mode="add" onClose={() => setShowAdd(false)} />
      </Show>
      <Show when={editing()}>
        <UserDialog mode="edit" user={editing()!} onClose={() => setEditing(null)} />
      </Show>
      <Show when={resetting()}>
        <ResetPasswordDialog user={resetting()!} onClose={() => setResetting(null)} />
      </Show>
    </div>
  );
}
