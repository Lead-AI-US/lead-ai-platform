import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { CalendarClock, Inbox, StickyNote, UserRound } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { CustomerTimeline } from "@/components/CustomerTimeline";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { db } from "@/lib/firebase/client";
import { formatDateTime } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import type { Conversation } from "@/types/conversation";
import type { Customer } from "@/types/customer";
import type { BusinessEvent } from "@/types/event";
import type { Lead } from "@/types/lead";

export default function CustomerProfile() {
  const { customerId } = useParams();
  const { workspace } = useWorkspace();
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!workspace || !customerId || !db) return;
    void getDoc(doc(db, "workspaces", workspace.id, "customers", customerId)).then((snap) =>
      setCustomer(snap.exists() ? (snap.data() as Customer) : null)
    );
    const eventQuery = query(
      collection(db, "workspaces", workspace.id, "events"),
      where("customerId", "==", customerId),
      orderBy("occurredAt", "desc")
    );
    const leadQuery = query(collection(db, "workspaces", workspace.id, "leads"), where("customerId", "==", customerId));
    const conversationQuery = query(
      collection(db, "workspaces", workspace.id, "conversations"),
      where("customerId", "==", customerId)
    );
    const unsubEvents = onSnapshot(eventQuery, (snap) => setEvents(snap.docs.map((event) => event.data() as BusinessEvent)));
    const unsubLeads = onSnapshot(leadQuery, (snap) => setLeads(snap.docs.map((lead) => lead.data() as Lead)));
    const unsubConversations = onSnapshot(conversationQuery, (snap) =>
      setConversations(snap.docs.map((conversation) => conversation.data() as Conversation))
    );
    return () => {
      unsubEvents();
      unsubLeads();
      unsubConversations();
    };
  }, [customerId, workspace]);

  if (!workspace) return null;
  if (customer === undefined) return <p className="text-sm text-muted-foreground">Loading customer…</p>;
  if (!customer) return <EmptyState icon={UserRound} title="Customer not found" description="This customer is not available in the active workspace." />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer"
        title={customer.displayName || customer.email || customer.phone || `Customer ${customer.id.slice(-6)}`}
        description="One workspace-scoped profile across conversations, leads, AI actions, and business events."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerTimeline events={events} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm">
                <Detail label="Email" value={customer.email ?? "Not captured"} />
                <Detail label="Phone" value={customer.phone ?? "Not captured"} />
                <Detail label="Source" value={customer.source ?? "Unknown"} />
                <Detail label="Latest intent" value={customer.latestIntent ?? "Unknown"} />
                <Detail label="First seen" value={formatDateTime(customer.firstSeenAt)} />
              </dl>
            </CardContent>
          </Card>

          <RelatedCard icon={Inbox} title="Conversations" count={conversations.length} href="/app/inbox" />
          <RelatedCard icon={UserRound} title="Related leads" count={leads.length} href="/app/leads" />
          <RelatedCard icon={CalendarClock} title="Bookings" count={0} label="Not configured" />
          <RelatedCard icon={StickyNote} title="Internal notes" count={0} label="Not configured" />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}

function RelatedCard({
  icon: Icon,
  title,
  count,
  href,
  label,
}: {
  icon: typeof Inbox;
  title: string;
  count: number;
  href?: string;
  label?: string;
}) {
  const content = (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 pt-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Badge tone={count ? "info" : "neutral"}>{label ?? String(count)}</Badge>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{content}</Link> : content;
}
