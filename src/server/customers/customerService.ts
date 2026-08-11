import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin.js";
import type { Customer } from "@/types/customer.js";

export function customerIdForVisitorSession(visitorSessionId: string): string {
  const hash = createHash("sha256").update(visitorSessionId).digest("hex").slice(0, 24);
  return `website_${hash}`;
}

export async function upsertWebsiteCustomer(params: {
  workspaceId: string;
  visitorSessionId: string;
  displayName?: string;
  email?: string;
  phone?: string;
  intent?: string;
  conversationDelta?: number;
  leadDelta?: number;
}): Promise<Customer | null> {
  const db = getAdminDb();
  if (!db) return null;

  const now = new Date().toISOString();
  const id = customerIdForVisitorSession(params.visitorSessionId);
  const ref = db.collection("workspaces").doc(params.workspaceId).collection("customers").doc(id);

  const createPayload: Customer = {
    id,
    workspaceId: params.workspaceId,
    displayName: params.displayName,
    email: params.email,
    phone: params.phone,
    source: "website_chat",
    preferredChannel: "website",
    tags: [],
    firstSeenAt: now,
    lastSeenAt: now,
    conversationCount: params.conversationDelta ?? 0,
    leadCount: params.leadDelta ?? 0,
    latestIntent: params.intent,
    createdAt: now,
    updatedAt: now,
  };

  const updatePayload: Record<string, unknown> = {
    lastSeenAt: now,
    updatedAt: now,
    source: "website_chat",
    preferredChannel: "website",
    ...(params.displayName ? { displayName: params.displayName } : {}),
    ...(params.email ? { email: params.email } : {}),
    ...(params.phone ? { phone: params.phone } : {}),
    ...(params.intent ? { latestIntent: params.intent } : {}),
    ...(params.conversationDelta ? { conversationCount: FieldValue.increment(params.conversationDelta) } : {}),
    ...(params.leadDelta ? { leadCount: FieldValue.increment(params.leadDelta) } : {}),
  };

  const doc = await ref.get();
  if (doc.exists) {
    await ref.update(updatePayload);
    const updated = await ref.get();
    return updated.data() as Customer;
  }

  await ref.set({ ...createPayload });
  return createPayload;
}
