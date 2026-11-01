import type { ParentProps } from 'solid-js';
import { Show } from 'solid-js';
import { A } from '@solidjs/router';
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
          <Show when={auth.isAuthenticated()}>
            <nav class="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
              <A href="/" class="hover:underline">
                Dashboard
              </A>
            </nav>
          </Show>
          <Show when={auth.isSuperuser()}>
            <nav class="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
              <A href="/admin/users" class="hover:underline">
                Users
              </A>
              <A href="/settings" class="hover:underline">
                Settings
              </A>
            </nav>
          </Show>
        </div>
        <UserMenu />
      </header>
      <main class="p-6">{props.children}</main>
    </div>
  );
}
