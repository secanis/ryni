import type { ParentProps } from 'solid-js';
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
        <a href="/" class="font-semibold text-lg">
          RÝNI
        </a>
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
