import { cn } from "@/lib/cn";

export function SignalField({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <div className="surface-grid absolute inset-0 opacity-45" />
      <div className="absolute left-[12%] top-14 h-48 w-48 rounded-full bg-accent/12 blur-3xl" />
      <div className="absolute right-[8%] top-1/3 h-64 w-64 rounded-full bg-info/10 blur-3xl" />
      <div className="absolute bottom-8 left-1/2 h-40 w-40 rounded-full bg-success/10 blur-3xl" />
    </div>
  );
}
