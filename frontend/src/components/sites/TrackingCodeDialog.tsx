import Modal from '~/components/ui/Modal';
import Snippet from '~/components/sites/Snippet';
import { trackingModeOf } from '~/utils/privacy';
import type { Site } from '~/types';

// Read-only integration snippet for an existing site, in its own dialog so the
// settings form stays short.
export default function TrackingCodeDialog(props: { site: Site; onClose: () => void }) {
  return (
    <Modal title="Tracking code" onClose={props.onClose}>
      <Snippet
        input={{
          server: window.location.origin,
          site: props.site.tracking_id,
          detailed: false,
          mode: trackingModeOf(props.site.tracking_mode),
        }}
      />
    </Modal>
  );
}
