export default function StatCard(props: { label: string; value: string }) {
  return (
    <div class="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      <div class="text-sm text-slate-500">{props.label}</div>
      <div class="text-2xl font-semibold">{props.value}</div>
    </div>
  );
}
