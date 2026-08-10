import { Menu, Moon, Sun, Monitor, LogOut } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTheme } from "@/lib/theme/useTheme";
import { Button } from "@/components/ui/Button";

export function WorkspaceHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { workspace } = useWorkspace();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 hover:bg-muted md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold">{workspace?.name ?? "Lead.AI"}</span>
        {workspace && (
          <span className="hidden text-xs text-muted-foreground sm:inline">Status: {workspace.status}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <ThemeButton icon={Sun} active={theme === "light"} onClick={() => setTheme("light")} label="Light theme" />
        <ThemeButton icon={Moon} active={theme === "dark"} onClick={() => setTheme("dark")} label="Dark theme" />
        <ThemeButton icon={Monitor} active={theme === "system"} onClick={() => setTheme("system")} label="System theme" />
        <Button variant="ghost" onClick={() => void signOut()} className="ml-1">
          <LogOut className="h-4 w-4" /> Sign out
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
      className={`rounded-md p-2 ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
