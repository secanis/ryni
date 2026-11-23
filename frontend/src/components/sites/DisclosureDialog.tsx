import { createSignal } from 'solid-js';
import Modal from '~/components/ui/Modal';
import CopyButton from '~/components/ui/CopyButton';
import { DEFAULT_DISCLOSURE_URL, bannerSnippet, disclosureText } from '~/utils/disclosure';
import { trackingModeOf } from '~/utils/privacy';
import type { Site } from '~/types';

// Preview of the generated privacy disclosure for the site's saved tier.
// The banner's "Learn more" link target is configurable and defaults to
// Rýni's own website; an empty value drops the link.
export default function DisclosureDialog(props: { site: Site; onClose: () => void }) {
  const mode = () => trackingModeOf(props.site.tracking_mode);
  const [privacyUrl, setPrivacyUrl] = createSignal(DEFAULT_DISCLOSURE_URL);

  const banner = () => bannerSnippet({ mode: mode(), privacyUrl: privacyUrl().trim() });

  return (
    <Modal title="Privacy disclosure" onClose={props.onClose}>
      <p class="text-sm text-muted">
        Enable Text or Banner in Site settings to publish this.
      </p>
      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-sm">Disclosure text</label>
            <CopyButton text={disclosureText({ mode: mode() })} label="Copy text" />
          </div>
          <pre class="whitespace-pre-wrap break-words text-sm font-mono border border-border rounded-radius-sm p-3 bg-surface dark:bg-surface-2 max-h-48 overflow-y-auto">
            {disclosureText({ mode: mode() })}
          </pre>
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-sm">Dismissal banner</label>
            <CopyButton text={banner()} label="Copy banner" />
          </div>
          <label for="disclosure-url" class="block text-xs text-muted mb-1">
            Learn more link
          </label>
          <input
            id="disclosure-url"
            type="url"
            value={privacyUrl()}
            onInput={(e) => setPrivacyUrl(e.currentTarget.value)}
            placeholder={DEFAULT_DISCLOSURE_URL}
            class="w-full border border-border rounded-radius-sm px-3 py-2 bg-surface dark:bg-surface-2 text-sm mb-2"
          />
          <pre class="whitespace-pre-wrap break-all text-sm font-mono border border-border rounded-radius-sm p-3 bg-surface dark:bg-surface-2 max-h-48 overflow-y-auto">
            {banner()}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
