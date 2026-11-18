import { For, onMount, Show } from 'solid-js';
import { auth } from '~/stores/auth';
import { adminStore } from '~/stores/admin';

export default function Users() {
  onMount(() => {
    if (auth.isSuperuser()) {
      void adminStore.loadUsers();
      void adminStore.loadSites();
    }
  });

  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold">Users</h1>

      <Show when={auth.isSuperuser()} fallback={<p class="text-muted">Admin only.</p>}>
        <table class="w-full text-sm bg-surface rounded-radius-card border border-border">
          <thead>
            <tr class="text-left border-b border-border">
              <th class="p-3">Email</th>
              <th class="p-3">Name</th>
              <th class="p-3">Role</th>
              <th class="p-3">Login</th>
              <th class="p-3">Sites</th>
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
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </div>
  );
}
