import { Show } from 'solid-js';
import { buildSnippets, type SnippetInput } from '~/utils/snippet';
import CopyButton from '~/components/ui/CopyButton';

export default function Snippet(props: { input: SnippetInput; onDone?: () => void }) {
  const snippets = () => buildSnippets(props.input);

  return (
    <div class="space-y-6 max-w-2xl">
      <div class="p-4 bg-surface rounded-radius-card border border-border">
        <div class="mb-2">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">Direct</h2>
            <CopyButton text={snippets().variantA} label="Copy snippet" />
          </div>
          <p class="text-xs text-muted">
            Easiest, but adblockers can block it.
          </p>
        </div>
        <pre class="text-xs bg-surface-2 p-3 rounded overflow-x-auto">
          {snippets().variantA}
        </pre>
      </div>

      <div class="p-4 bg-surface rounded-radius-card border border-border">
        <div class="mb-2">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">Proxy</h2>
            <CopyButton text={snippets().variantB} label="Copy snippet" />
          </div>
          <p class="text-xs text-muted">
            Adblock-proof, needs a small server setup.
          </p>
        </div>
        <pre class="text-xs bg-surface-2 p-3 rounded overflow-x-auto">
          {snippets().variantB}
        </pre>
        <pre class="text-xs text-muted mt-3 whitespace-pre-wrap">
          {snippets().proxyNote}
        </pre>
      </div>

      <Show when={props.onDone}>
        <button
          onClick={() => props.onDone!()}
          class="bg-accent text-accent-fg rounded-radius-sm px-4 py-2"
        >
          Done
        </button>
      </Show>
    </div>
  );
}
