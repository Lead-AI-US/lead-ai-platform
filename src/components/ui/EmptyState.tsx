import type { LucideIcon } from "lucide-react";

/**
 * Truthful empty state - no demo data, no vanity placeholders. Every
 * dashboard list uses this when there's genuinely nothing yet.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/60 px-4 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface shadow-soft">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
