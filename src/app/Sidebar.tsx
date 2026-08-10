import { NavLink } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { navigationGroups } from "@/lib/navigation";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";

export function Sidebar({ className }: { className?: string }) {
  const { workspace, role } = useWorkspace();

  return (
    <div className={cn("flex h-full flex-col gap-4 p-3", className)}>
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Lead.AI</p>
          <p className="truncate text-xs text-muted-foreground">{workspace?.status ?? "Workspace"}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <p className="truncate text-sm font-medium">{workspace?.name ?? "Loading workspace"}</p>
        <p className="truncate text-xs text-muted-foreground">{role ? `Role: ${role}` : "Membership required"}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-4" aria-label="Primary">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">{group.label}</p>
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
                      isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
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
