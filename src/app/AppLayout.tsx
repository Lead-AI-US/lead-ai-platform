import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { cn } from "@/lib/cn";
import { CommandPalette } from "@/components/CommandPalette";
import { SignalField } from "@/components/motion/SignalField";
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
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      <SignalField />
      <aside className="relative z-10 hidden w-72 shrink-0 border-r border-border/80 bg-surface/74 backdrop-blur-xl md:block">
        <Sidebar />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <aside className="relative z-50 h-full w-72 border-r border-border bg-surface/96 shadow-lift backdrop-blur-xl">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className={cn("relative z-10 flex min-w-0 flex-1 flex-col")}>
        <WorkspaceHeader onMenuClick={() => setMobileNavOpen(true)} onCommandClick={() => setCommandOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
      <CommandPalette commands={commands} workspaceId={workspace?.id} open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
