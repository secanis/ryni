import { useNavigate } from '@solidjs/router';
import type { Site } from '~/types';

export default function SiteCard(props: { site: Site }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/sites/${props.site.id}`)}
      class="text-left p-4 bg-white dark:bg-slate-900 rounded-lg shadow hover:shadow-md transition border border-slate-200 dark:border-slate-800"
    >
      <div class="font-medium truncate">{props.site.name}</div>
      <div class="text-sm text-slate-500 font-mono">{props.site.tracking_id}</div>
    </button>
  );
}
