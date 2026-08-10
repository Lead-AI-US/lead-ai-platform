import { Menu, Moon, Sun, Monitor, LogOut, Search } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTheme } from "@/lib/theme/useTheme";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function WorkspaceHeader({
  onMenuClick,
  onCommandClick,
}: {
  onMenuClick?: () => void;
  onCommandClick?: () => void;
}) {
  const { workspace } = useWorkspace();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 hover:bg-muted md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold">{workspace?.name ?? "Lead.AI"}</span>
          <span className="hidden text-xs text-muted-foreground sm:block">Business operating system</span>
        </div>
        {workspace && <Badge className="hidden capitalize sm:inline-flex">{workspace.status}</Badge>}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onCommandClick}
          className="hidden min-h-9 w-72 items-center justify-between rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:bg-muted lg:flex"
        >
          <span className="inline-flex items-center gap-2">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search or command
          </span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Cmd K</kbd>
        </button>
        <button
          type="button"
          onClick={onCommandClick}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
        <ThemeButton icon={Sun} active={theme === "light"} onClick={() => setTheme("light")} label="Light theme" />
        <ThemeButton icon={Moon} active={theme === "dark"} onClick={() => setTheme("dark")} label="Dark theme" />
        <ThemeButton icon={Monitor} active={theme === "system"} onClick={() => setTheme("system")} label="System theme" />
        <Button variant="ghost" onClick={() => void signOut()} className="ml-1 px-2 sm:px-4" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}

function ThemeButton({
  icon: Icon,
  active,
  onClick,
  label,
}: {
  icon: typeof Sun;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded-md p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
