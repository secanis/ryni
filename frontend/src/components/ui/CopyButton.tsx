import { createSignal } from 'solid-js';

// Copy-to-clipboard button with a brief "Copied" confirmation.
export default function CopyButton(props: { text: string; label?: string }) {
  const [copied, setCopied] = createSignal(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(props.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }

  return (
    <button
      onClick={() => void copy()}
      class="text-xs underline text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
    >
      {copied() ? 'Copied' : (props.label ?? 'Copy')}
    </button>
  );
}
