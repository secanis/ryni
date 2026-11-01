import { useNavigate } from '@solidjs/router';
import type { Site } from '~/types';
import CopyButton from '~/components/ui/CopyButton';

export default function SiteCard(props: { site: Site }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/sites/${props.site.id}`)}
      class="p-4 bg-white dark:bg-slate-900 rounded-lg shadow hover:shadow-md transition border border-slate-200 dark:border-slate-800 cursor-pointer"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="font-medium truncate">{props.site.name}</div>
          <div class="text-sm text-slate-500 font-mono">{props.site.tracking_id}</div>
        </div>
        <span onClick={(e) => e.stopPropagation()}>
          <CopyButton text={props.site.tracking_id} />
        </span>
      </div>
    </div>
  );
}
