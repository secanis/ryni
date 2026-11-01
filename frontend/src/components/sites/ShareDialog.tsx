import { createSignal, For, Show } from 'solid-js';
import { pb } from '~/services/pocketbase';
import { sitesStore } from '~/stores/sites';

interface UserHit {
  id: string;
  email: string;
  name: string;
}

export default function ShareDialog(props: { siteId: string; onClose: () => void }) {
  const [q, setQ] = createSignal('');
  const [results, setResults] = createSignal<UserHit[]>([]);
  const [role, setRole] = createSignal<'viewer' | 'manager'>('viewer');
  const [busy, setBusy] = createSignal(false);

  async function search() {
    const res = await pb.send('/api/ryni/users/search', { query: { q: q() } });
    setResults((res as { users: UserHit[] }).users);
  }

  async function grant(userId: string) {
    setBusy(true);
    try {
      await sitesStore.share(props.siteId, userId, role());
      props.onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={props.onClose}>
      <div
        class="bg-white dark:bg-slate-900 rounded-lg shadow p-6 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 class="font-semibold text-lg">Share site</h2>
        <div class="flex gap-2">
          <input
            value={q()}
            onInput={(e) => setQ(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && void search()}
            placeholder="user@example.com"
            class="flex-1 border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
          />
          <button
            onClick={() => void search()}
            class="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded px-3 py-2"
          >
            Search
          </button>
        </div>

        <div>
          <label class="block text-sm mb-1">Role</label>
          <select
            value={role()}
            onChange={(e) => setRole(e.currentTarget.value as 'viewer' | 'manager')}
            class="w-full border rounded px-3 py-2 dark:bg-slate-800 dark:border-slate-700"
          >
            <option value="viewer">Viewer</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <Show when={results().length > 0}>
          <ul class="divide-y divide-slate-200 dark:divide-slate-800">
            <For each={results()}>
              {(u) => (
                <li class="flex items-center justify-between py-2">
                  <div>
                    <div class="text-sm">{u.email}</div>
                    {u.name && <div class="text-xs text-slate-500">{u.name}</div>}
                  </div>
                  <button
                    onClick={() => void grant(u.id)}
                    disabled={busy()}
                    class="text-sm underline disabled:opacity-50"
                  >
                    Grant
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </div>
  );
}
