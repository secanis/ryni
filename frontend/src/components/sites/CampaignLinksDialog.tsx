import Modal from '~/components/ui/Modal';
import CampaignLinks from '~/components/sites/CampaignLinks';
import type { Site } from '~/types';

// UTM campaign links doc + builder, moved out of the settings form.
export default function CampaignLinksDialog(props: { site: Site; onClose: () => void }) {
  return (
    <Modal title="Campaign links" onClose={props.onClose}>
      <CampaignLinks baseUrl={props.site.allowed_origins?.[0] ?? ''} />
    </Modal>
  );
}
