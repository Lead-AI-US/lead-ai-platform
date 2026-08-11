import { Workflow } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const templates = [
  ["New Lead Follow-up", "When a lead is created, prepare a follow-up action for the team."],
  ["Missed Lead Recovery", "Detect leads that have gone untouched and recommend outreach."],
  ["Appointment Follow-up", "Prepare post-booking follow-up once bookings are connected."],
  ["After-Hours Lead Capture", "Route after-hours customer requests into handoff or follow-up."],
  ["Human Escalation", "Flag conversations that need a team member."],
  ["Knowledge Gap Alert", "Surface repeated unknown questions for knowledge creation."],
] as const;

export default function Automations() {
  return (
    <div>
      <PageHeader
        eyebrow="Automations"
        title="Automations"
        description="Domain primitives and safe templates for future workflow execution. No unavailable automation is shown as live."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map(([name, description]) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-4 w-4" aria-hidden="true" /> {name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{description}</p>
              <Badge>Template</Badge>
              <Badge className="ml-2">Execution not configured</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
