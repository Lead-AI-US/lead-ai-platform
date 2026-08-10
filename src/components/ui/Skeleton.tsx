export function Skeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div
      aria-label={label}
      className="h-24 animate-pulse rounded-lg border border-border bg-gradient-to-r from-muted via-border to-muted"
    />
  );
}
