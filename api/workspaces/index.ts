import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireFirebaseUser } from "@/lib/auth/serverAuth";
import { OnboardingSchema, slugify } from "@/lib/validation/onboarding";
import { parseBody, safeServerError } from "@/lib/http/apiHelpers";
import { generatePublicWidgetKey } from "@/lib/workspace/widgetKey";
import { workspaceMemberDocId, type Workspace, type WorkspaceMember } from "@/types/workspace";
import { trackEvent } from "@/lib/analytics/track";
import { recordAuditEvent } from "@/lib/audit/log";

/**
 * POST /api/workspaces — onboarding: creates a workspace and its owner
 * membership together in one Firestore batch (Step 11: atomic where
 * practical). Requires an authenticated Firebase user; does not require an
 * existing workspace (this IS how the first workspace gets created).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const user = await requireFirebaseUser(req, res);
  if (!user) return;

  const input = parseBody(req, res, OnboardingSchema);
  if (!input) return;

  const db = getAdminDb();
  if (!db) {
    return res.status(503).json({ error: "database_not_configured" });
  }

  try {
    const workspaceRef = db.collection("workspaces").doc();
    const now = new Date().toISOString();
    const workspace: Workspace = {
      id: workspaceRef.id,
      name: input.businessName,
      slug: slugify(input.businessName, workspaceRef.id.slice(0, 6)),
      status: "onboarding",
      timezone: input.timezone,
      businessType: input.businessType,
      primaryGoal: input.primaryGoal,
      websiteDomain: input.websiteDomain,
      publicWidgetKey: generatePublicWidgetKey(),
      allowedOrigins: [],
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
    };

    const memberRef = db.collection("workspaceMembers").doc(workspaceMemberDocId(workspaceRef.id, user.uid));
    const member: WorkspaceMember = {
      workspaceId: workspaceRef.id,
      userId: user.uid,
      role: "owner",
      status: "active",
      createdAt: now,
    };

    const batch = db.batch();
    batch.set(workspaceRef, { ...workspace });
    batch.set(memberRef, { ...member });
    await batch.commit();

    await trackEvent({ workspaceId: workspace.id, eventName: "workspace_created", actorType: "workspace_user", actorId: user.uid });
    await recordAuditEvent({ workspaceId: workspace.id, event: "workspace_created", actorUid: user.uid });

    return res.status(201).json({ workspace });
  } catch (error) {
    return safeServerError(res, "POST /api/workspaces", error);
  }
}
