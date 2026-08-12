import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";
import type { BusinessEvent, BusinessEventType } from "@/types/event";

const EVENT_COPY: Record<BusinessEventType, { title: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  visitor_started: { title: "Visitor identified", tone: "neutral" },
  conversation_started: { title: "Conversation started", tone: "info" },
  message_received: { title: "Customer message received", tone: "neutral" },
  message_sent: { title: "AI message sent", tone: "info" },
  knowledge_matched: { title: "Knowledge matched", tone: "success" },
  knowledge_missing: { title: "Knowledge gap detected", tone: "warning" },
  intent_detected: { title: "Intent detected", tone: "info" },
  lead_created: { title: "Lead created", tone: "success" },
  lead_qualified: { title: "Lead qualified", tone: "success" },
  lead_stage_changed: { title: "Lead stage changed", tone: "neutral" },
  booking_requested: { title: "Booking requested", tone: "warning" },
  booking_created: { title: "Booking created", tone: "success" },
  human_handoff_requested: { title: "Human handoff requested", tone: "warning" },
  human_handoff_completed: { title: "Human handoff completed", tone: "success" },
  followup_scheduled: { title: "Follow-up scheduled", tone: "info" },
  followup_sent: { title: "Follow-up sent", tone: "success" },
  conversation_resolved: { title: "Conversation resolved", tone: "success" },
  customer_returned: { title: "Customer returned", tone: "info" },
  automation_started: { title: "Automation started", tone: "info" },
  automation_completed: { title: "Automation completed", tone: "success" },
  automation_failed: { title: "Automation failed", tone: "danger" },
  agent_action_proposed: { title: "Action proposed", tone: "info" },
  agent_action_validated: { title: "Action validated", tone: "success" },
  agent_action_approval_required: { title: "Approval required", tone: "warning" },
  agent_action_started: { title: "Action started", tone: "info" },
  agent_action_completed: { title: "Action completed", tone: "success" },
  agent_action_failed: { title: "Action failed", tone: "danger" },
  agent_action_cancelled: { title: "Action cancelled", tone: "neutral" },
};

export function CustomerTimeline({ events }: { events: BusinessEvent[] }) {
  if (!events.length) {
    return (
      <Card>
        <CardContent className="pt-4 text-sm text-muted-foreground">No timeline events have been recorded yet.</CardContent>
      </Card>
    );
  }

  return (
    <ol className="space-y-3" aria-label="Customer timeline">
      {events.map((event) => {
        const copy = EVENT_COPY[event.type];
        return (
          <li key={event.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{copy.title}</h3>
                  <Badge tone={copy.tone}>{event.actor.type}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</p>
                <EventDetails event={event} />
              </div>
              {event.conversationId && (
                <Link to="/app/inbox" className="text-xs font-medium text-primary underline">
                  Open inbox
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EventDetails({ event }: { event: BusinessEvent }) {
  const details = [
    typeof event.metadata.intent === "string" ? `Intent: ${event.metadata.intent}` : undefined,
    typeof event.metadata.status === "string" ? `Status: ${event.metadata.status}` : undefined,
    typeof event.metadata.reason === "string" ? event.metadata.reason : undefined,
  ].filter(Boolean);

  if (!details.length) return null;
  return <p className="mt-2 text-sm text-muted-foreground">{details.join(" · ")}</p>;
}
