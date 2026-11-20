import type { ParentProps } from 'solid-js';
import { Show } from 'solid-js';
import { A } from '@solidjs/router';
import { auth } from '~/stores/auth';
import UserMenu from './UserMenu';

export default function Shell(props: ParentProps) {
  return (
    <div class="min-h-screen bg-bg">
      <header class="flex items-center justify-between px-6 py-3 border-b border-border">
        <div class="flex items-center gap-6">
          <a href="/" class="flex items-center" aria-label="RÝNI home">
            <img src="/logo-dark.png" alt="RÝNI" class="dark:hidden h-6 w-auto" />
            <img src="/logo.png" alt="RÝNI" class="hidden h-6 w-auto dark:block" />
          </a>
          <Show when={auth.isAuthenticated()}>
            <nav class="flex gap-3 text-sm text-muted">
              <A href="/" class="hover:underline">
                Dashboard
              </A>
              <A href="/about" class="hover:underline">
                About
              </A>
            </nav>
          </Show>
          <Show when={auth.isSuperuser()}>
            <nav class="flex gap-3 text-sm text-muted">
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
