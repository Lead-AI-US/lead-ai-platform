import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function SpatialCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card/92 text-card-foreground spatial-glow",
        "transition-[border-color,box-shadow,transform] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lift",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        "after:pointer-events-none after:absolute after:-right-24 after:-top-24 after:h-48 after:w-48 after:rounded-full after:bg-accent/10 after:blur-3xl after:transition-opacity group-hover:after:opacity-80",
        className
      )}
      {...props}
    />
  );
}

export function SpatialCardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative flex flex-col gap-1 p-4 sm:p-5", className)} {...props} />;
}

export function SpatialCardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative p-4 pt-0 sm:p-5 sm:pt-0", className)} {...props} />;
}

export function SpatialCardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative border-t border-border/70 p-4 sm:p-5", className)} {...props} />;
}
