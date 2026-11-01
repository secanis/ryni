import { createSignal } from 'solid-js';
import { Copy, Check } from 'lucide-solid';

// Copy-to-clipboard button: a copy icon that flashes a check on success.
export default function CopyButton(props: { text: string; label?: string }) {
  const [copied, setCopied] = createSignal(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(props.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={props.label ?? 'Copy'}
      aria-label={props.label ?? 'Copy'}
      class="inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
    >
      {copied() ? <Check size={14} class="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}
