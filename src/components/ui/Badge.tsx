import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "info" | "warning" | "success" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-info/20 bg-info/10 text-blue-600 dark:text-blue-300",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  danger: "bg-destructive/10 text-destructive",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        "border",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}
