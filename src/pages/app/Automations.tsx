import { Workflow } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Automations() {
  return (
    <div>
      <PageHeader
        eyebrow="Automations"
        title="Automations"
        description="Workflow surfaces are ready for website chat, follow-up, booking, email, WhatsApp, and CRM modules once backend execution is added."
      />
      <EmptyState
        icon={Workflow}
        title="No automations configured"
        description="Configured, workspace-authorized automation modules will appear here. No unavailable module is shown as live."
      />
    </div>
  );
}
