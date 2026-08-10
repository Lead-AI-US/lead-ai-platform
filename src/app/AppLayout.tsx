import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { cn } from "@/lib/cn";
import { CommandPalette } from "@/components/CommandPalette";
import { createCommandRegistry } from "@/lib/commandRegistry";
import { useTheme } from "@/lib/theme/useTheme";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { widgetSnippet } from "@/lib/workspace/widgetSnippet";

export default function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { workspace } = useWorkspace();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const commands = useMemo(
    () =>
      createCommandRegistry({
        navigate,
        setTheme,
        copyWidgetSnippet: async () => {
          if (!workspace || !navigator.clipboard) return;
          await navigator.clipboard.writeText(widgetSnippet(workspace.publicWidgetKey));
        },
      }),
    [navigate, setTheme, workspace]
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-border md:block">
        <Sidebar />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <aside className="relative z-50 h-full w-72 bg-background border-r border-border">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className={cn("flex min-w-0 flex-1 flex-col")}>
        <WorkspaceHeader onMenuClick={() => setMobileNavOpen(true)} onCommandClick={() => setCommandOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette commands={commands} open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
