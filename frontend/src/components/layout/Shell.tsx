import type { ParentProps } from 'solid-js';
import { Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { auth } from '~/stores/auth';

export default function Shell(props: ParentProps) {
  const navigate = useNavigate();

  function signOut() {
    auth.signOut();
    navigate('/login');
  }

  return (
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header class="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-6">
          <a href="/" class="font-semibold text-lg">
            RÝNI
          </a>
          <Show when={auth.isSuperuser()}>
            <nav class="flex gap-3 text-sm">
              <a href="/admin/users" class="hover:underline">
                Users
              </a>
              <a href="/admin/oidc" class="hover:underline">
                OIDC
              </a>
            </nav>
          </Show>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-500">{auth.user()?.email ?? ''}</span>
          <button onClick={signOut} class="text-sm underline">
            Sign out
          </button>
        </div>
      </header>
      <main class="p-6">{props.children}</main>
    </div>
  );
}
