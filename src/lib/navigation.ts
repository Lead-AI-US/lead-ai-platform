import {
  BarChart3,
  Bot,
  BookOpen,
  BrainCircuit,
  Code2,
  Gauge,
  GitBranch,
  Inbox,
  MessageSquareText,
  Settings,
  UserRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigationGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { to: "/app", label: "Overview", icon: Gauge, end: true },
      { to: "/app/inbox", label: "Inbox", icon: MessageSquareText },
      { to: "/app/customers", label: "Customers", icon: UserRound },
      { to: "/app/leads", label: "Leads", icon: Inbox },
    ],
  },
  {
    label: "AI",
    items: [
      { to: "/app/ai-agent", label: "AI Agent", icon: Bot },
      { to: "/app/knowledge", label: "Knowledge", icon: BookOpen },
      { to: "/app/automations", label: "Automations", icon: Workflow },
      { to: "/app/ai-assets", label: "AI Assets", icon: BrainCircuit },
    ],
  },
  {
    label: "Insights",
    items: [{ to: "/app/analytics", label: "Analytics", icon: BarChart3 }],
  },
  {
    label: "Platform",
    items: [
      { to: "/app/integrations", label: "Integrations", icon: GitBranch },
      { to: "/app/developer", label: "Developer", icon: Code2 },
      { to: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function flatNavigation(): NavItem[] {
  return navigationGroups.flatMap((group) => group.items);
}
