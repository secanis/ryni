import { createSignal, For, Show } from 'solid-js';
import { auth } from '~/stores/auth';
import OidcForm from '~/components/settings/OidcForm';
import BackupPanel from '~/components/settings/BackupPanel';

type Tab = 'oidc' | 'backup';

const TABS: { id: Tab; label: string }[] = [
  { id: 'oidc', label: 'OIDC / SSO' },
  { id: 'backup', label: 'Backup' },
];

export default function Settings() {
  const [tab, setTab] = createSignal<Tab>('oidc');

  return (
    <div class="space-y-6 max-w-2xl">
      <h1 class="text-2xl font-semibold">Settings</h1>

      <Show when={auth.isSuperuser()} fallback={<p class="text-slate-500">Admin only.</p>}>
        <div class="flex gap-1 border-b border-slate-200 dark:border-slate-800">
          <For each={TABS}>
            {(t) => (
              <button
                type="button"
                onClick={() => setTab(t.id)}
                class={`px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${
                  tab() === t.id
                    ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-white font-medium'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            )}
          </For>
        </div>

        <Show when={tab() === 'oidc'} fallback={<BackupPanel />}>
          <OidcForm />
        </Show>
      </Show>
    </div>
  );
}
