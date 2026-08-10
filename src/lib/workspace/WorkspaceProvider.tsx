import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "@/types/workspace";

interface WorkspaceContextValue {
  /** undefined = loading, null = authenticated but no workspace yet (-> onboarding) */
  workspace: Workspace | null | undefined;
  role: WorkspaceRole | null;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Resolves the signed-in user's active workspace from real Firestore state
 * (workspaceMembers, then workspaces) - never hardcoded, never a fake owner
 * flag. This is a WorkspaceSwitcher-ready single-workspace resolution: it
 * takes the user's first active membership. A multi-workspace switcher can
 * be added later without changing this data shape.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null | undefined>(undefined);
  const [role, setRole] = useState<WorkspaceRole | null>(null);

  async function refresh() {
    if (!user || !db) {
      setWorkspace(null);
      setRole(null);
      return;
    }

    const membershipsQuery = query(
      collection(db, "workspaceMembers"),
      where("userId", "==", user.uid),
      where("status", "==", "active"),
      limit(1)
    );
    const memberSnap = await getDocs(membershipsQuery);
    if (memberSnap.empty) {
      setWorkspace(null);
      setRole(null);
      return;
    }

    const membership = memberSnap.docs[0].data() as WorkspaceMember;
    const workspaceDoc = await getDoc(doc(db, "workspaces", membership.workspaceId));
    if (!workspaceDoc.exists()) {
      setWorkspace(null);
      setRole(null);
      return;
    }

    setWorkspace(workspaceDoc.data() as Workspace);
    setRole(membership.role);
  }

  useEffect(() => {
    if (user === undefined) return; // auth still loading
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ workspace, role, refresh }}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
