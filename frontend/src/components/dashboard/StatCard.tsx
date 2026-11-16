export default function StatCard(props: { label: string; value: string }) {
  return (
    <div class="p-4 bg-surface rounded-radius-card border border-border">
      <div class="text-sm text-muted">{props.label}</div>
      <div class="text-2xl font-semibold">{props.value}</div>
    </div>
  );
}
