import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Search, UserRound } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { db } from "@/lib/firebase/client";
import { formatDateTime } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import type { Customer } from "@/types/customer";

export default function Customers() {
  const { workspace } = useWorkspace();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!workspace || !db) return;
    const q = query(collection(db, "workspaces", workspace.id, "customers"), orderBy("lastSeenAt", "desc"));
    return onSnapshot(q, (snap) => setCustomers(snap.docs.map((doc) => doc.data() as Customer)));
  }, [workspace]);

  if (!workspace) return null;

  const filtered =
    customers?.filter((customer) =>
      [customer.displayName, customer.email, customer.phone, customer.source, customer.latestIntent, ...customer.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    ) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Customer Intelligence"
        title="Customers"
        description="Canonical customer records linked to conversations, leads, intents, and outcomes."
      />

      <label className="relative mb-4 block text-sm">
        <span className="sr-only">Search customers</span>
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search customers" />
      </label>

      {customers === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered?.length === 0 ? (
        <EmptyState icon={UserRound} title="No customers yet" description="Customers are created from real workspace conversations and leads." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Latest intent</th>
                <th className="p-3 font-medium">Activity</th>
                <th className="p-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <Link to={`/app/customers/${customer.id}`} className="font-medium text-primary underline">
                      {customer.displayName || customer.email || customer.phone || `Customer ${customer.id.slice(-6)}`}
                    </Link>
                    <div className="text-xs text-muted-foreground">{customer.preferredChannel ?? "website"}</div>
                  </td>
                  <td className="p-3">
                    {customer.latestIntent ? <Badge tone="info">{customer.latestIntent}</Badge> : <span className="text-muted-foreground">Unknown</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {customer.conversationCount} conversations · {customer.leadCount} leads
                  </td>
                  <td className="p-3 text-muted-foreground">{formatDateTime(customer.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
