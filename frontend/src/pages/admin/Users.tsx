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

      <Show when={auth.isSuperuser()} fallback={<p class="text-slate-500">Admin only.</p>}>
        <table class="w-full text-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <thead>
            <tr class="text-left border-b border-slate-200 dark:border-slate-800">
              <th class="p-3">Email</th>
              <th class="p-3">Name</th>
              <th class="p-3">Sites</th>
            </tr>
          </thead>
          <tbody>
            <For each={adminStore.users()}>
              {(u) => (
                <tr class="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td class="p-3">{u.email}</td>
                  <td class="p-3">{u.name}</td>
                  <td class="p-3">
                    <For each={adminStore.allSites()}>
                      {(site) => {
                        const role = () => adminStore.roleOn(u.id, site.id);
                        return (
                          <Show when={role()}>
                            <span class="inline-block mr-1 mb-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">
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
