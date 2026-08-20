import { NavLink } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { navigationGroups } from "@/lib/navigation";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";

export function Sidebar({ className }: { className?: string }) {
  const { workspace, role } = useWorkspace();

  return (
    <div className={cn("flex h-full flex-col gap-5 p-3", className)}>
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-surface to-accent-soft text-primary shadow-soft">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">Lead.AI</p>
          <p className="truncate text-xs text-muted-foreground">AI business OS</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/70 p-3 shadow-soft">
        <p className="truncate text-sm font-medium">{workspace?.name ?? "Loading workspace"}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{role ? `Role: ${role}` : "Membership required"}</p>
          <span className="h-2 w-2 rounded-full bg-success shadow-glow" aria-hidden="true" />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-4" aria-label="Primary">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{group.label}</p>
            <div className="flex flex-col gap-1">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-surface-interactive hover:text-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
