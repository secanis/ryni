import { Show } from 'solid-js';
import { buildSnippets, type SnippetInput } from '~/utils/snippet';
import CopyButton from '~/components/ui/CopyButton';

export default function Snippet(props: { input: SnippetInput; onDone?: () => void }) {
  const snippets = () => buildSnippets(props.input);

  return (
    <div class="space-y-6 max-w-2xl">
      <div class="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">Variant A — direct</h2>
          <CopyButton text={snippets().variantA} label="Copy snippet" />
        </div>
        <pre class="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-x-auto">
          {snippets().variantA}
        </pre>
      </div>

      <div class="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">Variant B — proxy (same origin)</h2>
          <CopyButton text={snippets().variantB} label="Copy snippet" />
        </div>
        <pre class="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-x-auto">
          {snippets().variantB}
        </pre>
        <pre class="text-xs text-slate-600 dark:text-slate-400 mt-3 whitespace-pre-wrap">
          {snippets().proxyNote}
        </pre>
      </div>

      <Show when={props.onDone}>
        <button
          onClick={() => props.onDone!()}
          class="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded px-4 py-2"
        >
          Done
        </button>
      </Show>
    </div>
  );
}
