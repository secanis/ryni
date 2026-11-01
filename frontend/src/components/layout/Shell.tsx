import type { ParentProps } from 'solid-js';
import { Show } from 'solid-js';
import { auth } from '~/stores/auth';
import UserMenu from './UserMenu';

export default function Shell(props: ParentProps) {
  return (
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header class="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-6">
          <a href="/" class="font-semibold text-lg text-slate-900 dark:text-white">
            RÝNI
          </a>
          <Show when={auth.isSuperuser()}>
            <nav class="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
              <a href="/admin/users" class="hover:underline">
                Users
              </a>
              <a href="/admin/oidc" class="hover:underline">
                OIDC
              </a>
              <a href="/admin/backup" class="hover:underline">
                Backup
              </a>
            </nav>
          </Show>
        </div>
        <UserMenu />
      </header>
      <main class="p-6">{props.children}</main>
    </div>
  );
}
