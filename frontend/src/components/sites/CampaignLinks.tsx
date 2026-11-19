import { createMemo, createSignal, Show, untrack } from 'solid-js';
import { buildCampaignUrl } from '~/utils/campaignUrl';
import CopyButton from '~/components/ui/CopyButton';

// In-app documentation for UTM campaign links plus a small builder. Lives in
// the site edit dialog, next to the tracking snippets, because that is where
// a site's integration is set up.
export default function CampaignLinks(props: { baseUrl?: string }) {
  const [base, setBase] = createSignal(untrack(() => props.baseUrl ?? ''));
  const [source, setSource] = createSignal('');
  const [medium, setMedium] = createSignal('');
  const [campaign, setCampaign] = createSignal('');

  const url = createMemo(() =>
    buildCampaignUrl({ base: base(), source: source(), medium: medium(), campaign: campaign() }),
  );

  const field = 'w-full border border-border rounded-radius-sm px-3 py-2 bg-surface dark:bg-surface-2 text-sm';

  return (
    <section class="space-y-4">
      <div>
        <h3 class="font-medium">Campaigns (UTM)</h3>
        <p class="text-sm text-muted mt-1">
          Tag links that point at your site so Rýni can attribute visits to a campaign. Add these
          query parameters to the URL people click — they must be present on the first page a
          visitor lands on.
        </p>
      </div>

      <dl class="text-sm text-muted space-y-1.5">
        <div>
          <dt class="inline font-mono text-xs text-text">utm_source</dt>
          <dd class="inline"> where the traffic comes from, e.g. <code>newsletter</code>, <code>linkedin</code>, <code>partner-name</code></dd>
        </div>
        <div>
          <dt class="inline font-mono text-xs text-text">utm_medium</dt>
          <dd class="inline"> the channel type, e.g. <code>email</code>, <code>social</code>, <code>cpc</code>, <code>banner</code></dd>
        </div>
        <div>
          <dt class="inline font-mono text-xs text-text">utm_campaign</dt>
          <dd class="inline"> the specific campaign, e.g. <code>launch-2026</code>, <code>black-friday</code></dd>
        </div>
      </dl>

      <p class="text-sm text-muted">
        Rýni reads only these three parameters; <code>utm_term</code> and <code>utm_content</code>{' '}
        are ignored. Values are case-sensitive, so keep them lowercase and use hyphens instead of
        spaces. Reuse the same spelling for every link of a campaign — otherwise each variant shows
        up as its own row under <span class="text-text">UTM source</span>,{' '}
        <span class="text-text">UTM medium</span> and{' '}
        <span class="text-text">UTM campaign</span> on the dashboard.
      </p>

      <div class="p-4 bg-surface-2 rounded-radius-card border border-border space-y-3">
        <h4 class="text-sm font-medium">Build a campaign link</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2">
            <label for="campaign-base" class="block text-xs mb-1 text-muted">
              Page URL
            </label>
            <input
              id="campaign-base"
              value={base()}
              onInput={(e) => setBase(e.currentTarget.value)}
              placeholder="https://mysite.example/landing"
              class={field}
            />
          </div>
          <div>
            <label for="campaign-source" class="block text-xs mb-1 text-muted">
              Source
            </label>
            <input
              id="campaign-source"
              value={source()}
              onInput={(e) => setSource(e.currentTarget.value)}
              placeholder="newsletter"
              class={field}
            />
          </div>
          <div>
            <label for="campaign-medium" class="block text-xs mb-1 text-muted">
              Medium
            </label>
            <input
              id="campaign-medium"
              value={medium()}
              onInput={(e) => setMedium(e.currentTarget.value)}
              placeholder="email"
              class={field}
            />
          </div>
          <div class="sm:col-span-2">
            <label for="campaign-name" class="block text-xs mb-1 text-muted">
              Campaign
            </label>
            <input
              id="campaign-name"
              value={campaign()}
              onInput={(e) => setCampaign(e.currentTarget.value)}
              placeholder="launch-2026"
              class={field}
            />
          </div>
        </div>

        <Show
          when={url()}
          fallback={<p class="text-xs text-muted">Enter a page URL to build a campaign link.</p>}
        >
          <div class="flex items-start justify-between gap-2">
            <code data-testid="campaign-url" class="text-xs break-all bg-surface p-3 rounded flex-1">
              {url()}
            </code>
            <CopyButton text={url()} label="Copy campaign link" />
          </div>
        </Show>
      </div>
    </section>
  );
}
