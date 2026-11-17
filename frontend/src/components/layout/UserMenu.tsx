import { createSignal, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { ChevronDown, LogOut, Monitor, Moon, Sun } from 'lucide-solid';
import { auth } from '~/stores/auth';
import { themeStore, type ThemeMode } from '~/stores/theme';

function getInitials(email: string): string {
  if (!email) return '?';
  const parts = email.split('@')[0].split('.');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function UserMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);

  const email = () => auth.user()?.email ?? '';
  const initials = () => getInitials(email());
  const roleLabel = () => (auth.isSuperuser() ? 'Superuser' : 'User');

  function signOut() {
    auth.signOut();
    navigate('/login');
  }

  function close() {
    setOpen(false);
  }

  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        class="flex items-center gap-2 px-2 py-1 rounded-radius-sm hover:bg-surface-2 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open()}
      >
        <div class="w-7 h-7 rounded-full bg-gradient-to-br from-accent-3 to-accent-2 flex items-center justify-center text-white text-xs font-medium">
          {initials()}
        </div>
        <span class="text-sm text-text hidden md:block max-w-[180px] truncate">
          {email()}
        </span>
        <ChevronDown size={14} class="text-muted" />
      </button>

      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={close} />
        <div class="absolute right-0 mt-1 w-64 bg-surface rounded-radius-card shadow-xl border border-border z-50">
          <div class="px-4 py-3 border-b border-border">
            <div class="text-text text-sm font-medium truncate">{email()}</div>
            <div class="text-muted text-xs mt-0.5">{roleLabel()}</div>
          </div>

          <div class="px-4 py-3 border-b border-border">
            <div class="text-xs text-muted uppercase mb-2">Theme</div>
            <div class="grid grid-cols-3 gap-1">
              <For each={THEME_OPTIONS}>
                {(opt) => (
                  <button
                    type="button"
                    onClick={() => themeStore.setMode(opt.value)}
                    class={`flex flex-col items-center gap-1 rounded-radius-sm px-1 py-2 text-xs transition-colors ${
                      themeStore.mode === opt.value
                        ? 'bg-surface-2 text-text'
                        : 'text-muted hover:bg-surface-2'
                    }`}
                  >
                    <opt.icon size={16} />
                    {opt.label}
                  </button>
                )}
              </For>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            class="w-full text-left px-4 py-2.5 text-text hover:bg-surface-2 flex items-center gap-2 text-sm"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </Show>
    </div>
  );
}
