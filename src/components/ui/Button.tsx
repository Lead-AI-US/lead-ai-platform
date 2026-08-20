import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-soft hover:shadow-lift hover:opacity-95",
  secondary: "border border-border bg-surface text-foreground hover:border-border-hover hover:bg-surface-interactive",
  ghost: "text-foreground hover:bg-surface-interactive",
  destructive: "bg-destructive text-destructive-foreground shadow-soft hover:opacity-95",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = "primary", disabled, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
      "transition-[background-color,border-color,box-shadow,color,transform] duration-200 motion-safe:hover:-translate-y-px",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-50",
      VARIANT_CLASSES[variant],
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";
