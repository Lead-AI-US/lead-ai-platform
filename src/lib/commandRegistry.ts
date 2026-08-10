import type { NavigateFunction } from "react-router-dom";
import { flatNavigation } from "@/lib/navigation";

export interface CommandAction {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  run: () => void | Promise<void>;
}

export function createCommandRegistry({
  navigate,
  copyWidgetSnippet,
  setTheme,
}: {
  navigate: NavigateFunction;
  copyWidgetSnippet: () => Promise<void> | void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}): CommandAction[] {
  return [
    ...flatNavigation().map((item) => ({
      id: `go:${item.to}`,
      label: `Go to ${item.label}`,
      description: `Open ${item.label}`,
      keywords: [item.label.toLowerCase(), "navigation"],
      run: () => navigate(item.to),
    })),
    {
      id: "lead:create",
      label: "Create Lead",
      description: "Open Leads. Manual lead creation remains API-backed.",
      keywords: ["lead", "create", "crm"],
      run: () => navigate("/app/leads"),
    },
    {
      id: "knowledge:add",
      label: "Add Knowledge",
      description: "Open Knowledge to add an approved-source draft.",
      keywords: ["knowledge", "draft", "ai"],
      run: () => navigate("/app/knowledge"),
    },
    {
      id: "analytics:open",
      label: "Open Analytics",
      description: "Review real persisted analytics events.",
      keywords: ["analytics", "events", "metrics"],
      run: () => navigate("/app/analytics"),
    },
    {
      id: "widget:copy",
      label: "Copy Widget Snippet",
      description: "Copy the workspace widget snippet when a workspace is loaded.",
      keywords: ["widget", "developer", "snippet"],
      run: copyWidgetSnippet,
    },
    {
      id: "theme:system",
      label: "Change Theme",
      description: "Use the system appearance setting.",
      keywords: ["theme", "dark", "light"],
      run: () => setTheme("system"),
    },
  ];
}

export function searchCommands(commands: CommandAction[], query: string): CommandAction[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return commands;

  return commands.filter((command) =>
    [command.label, command.description, ...command.keywords].join(" ").toLowerCase().includes(normalized)
  );
}
