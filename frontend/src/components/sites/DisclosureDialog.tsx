import Modal from '~/components/ui/Modal';
import CopyButton from '~/components/ui/CopyButton';
import { bannerSnippet, disclosureText } from '~/utils/disclosure';
import { trackingModeOf } from '~/utils/privacy';
import type { Site } from '~/types';

// Preview of the generated privacy disclosure for the site's saved tier.
export default function DisclosureDialog(props: { site: Site; onClose: () => void }) {
  const mode = () => trackingModeOf(props.site.tracking_mode);

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
            <CopyButton text={bannerSnippet({ mode: mode() })} label="Copy banner" />
          </div>
          <pre class="whitespace-pre-wrap break-all text-sm font-mono border border-border rounded-radius-sm p-3 bg-surface dark:bg-surface-2 max-h-48 overflow-y-auto">
            {bannerSnippet({ mode: mode() })}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
