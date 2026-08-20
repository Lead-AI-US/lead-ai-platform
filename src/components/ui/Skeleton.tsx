export function Skeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div
      aria-label={label}
      className="h-24 animate-pulse rounded-xl border border-border bg-gradient-to-r from-muted via-surface-interactive to-muted"
    />
  );
}
