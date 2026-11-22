import type { JSX } from 'solid-js';

// Minimal modal shell: fixed overlay + card + title/close header.
// Clicking the overlay calls onClose; clicking the card does not (the card
// stops propagation). Shared by the site detail dialogs.
export default function Modal(props: {
  title: string;
  onClose: () => void;
  children: JSX.Element;
  maxWidth?: string;
}) {
  return (
    <div
      class="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto p-4"
      onClick={() => props.onClose()}
    >
      <div
        class={`bg-surface rounded-radius-card shadow p-6 w-full ${props.maxWidth ?? 'max-w-2xl'} space-y-4 my-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-lg">{props.title}</h2>
          <button
            type="button"
            onClick={() => props.onClose()}
            aria-label="Close"
            class="text-muted hover:text-text"
          >
            ✕
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}
