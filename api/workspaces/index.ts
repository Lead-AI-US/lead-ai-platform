import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../../src/lib/firebase/admin.js";
import { requireFirebaseUser } from "../../src/lib/auth/serverAuth.js";
import { OnboardingSchema, slugify } from "../../src/lib/validation/onboarding.js";
import { parseBody, safeServerError } from "../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../src/lib/http/rateLimit.js";
import { generatePublicWidgetKey } from "../../src/lib/workspace/widgetKey.js";
import { workspaceMemberDocId, type Workspace, type WorkspaceMember } from "../../src/types/workspace.js";
import { trackEvent } from "../../src/lib/analytics/track.js";
import { recordAuditEvent } from "../../src/lib/audit/log.js";

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

  // No workspace exists yet -- this route creates the first one -- so the
  // rate limiter's per-workspace Firestore path is keyed on a fixed
  // sentinel instead, scoped per user rather than per workspace.
  const rateLimit = await checkRateLimit("_global", `create-workspace:${user.uid}`, 10);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

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
      // websiteDomain is optional (a new business may not have a site yet).
      // Firestore rejects `undefined` field values outright, so it must be
      // omitted entirely rather than set to undefined.
      ...(input.websiteDomain ? { websiteDomain: input.websiteDomain } : {}),
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
      ...(user.email ? { email: user.email } : {}),
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
