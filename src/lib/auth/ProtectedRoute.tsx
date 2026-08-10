import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";

/**
 * unauthenticated -> /login
 * authenticated but no workspace -> /onboarding
 * authenticated + workspace -> render the protected route
 */
export function ProtectedRoute() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  if (user === undefined) return <FullPageSpinner />;
  if (user === null) return <Navigate to="/login" replace />;
  if (workspace === undefined) return <FullPageSpinner />;
  if (workspace === null) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}

/** Like ProtectedRoute, but for /onboarding itself - must NOT require a workspace. */
export function RequireAuthOnly() {
  const { user } = useAuth();
  if (user === undefined) return <FullPageSpinner />;
  if (user === null) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
