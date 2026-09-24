import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { apiPost } from "@/lib/api/client";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthPageShell, ConfigWarning } from "./Login";

type Status = "idle" | "accepting" | "accepted" | "error";

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const workspaceId = params.get("workspaceId");
  const inviteId = params.get("inviteId");
  const prefillEmail = params.get("email") ?? "";

  const { user, isFirebaseConfigured, signIn, signUp } = useAuth();
  const { refresh } = useWorkspace();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Hooks must run on every render regardless of the params below, so the
  // "link incomplete" bail-out happens after them, not before.
  useEffect(() => {
    if (!workspaceId || !inviteId) return;
    if (user === undefined || user === null || status !== "idle") return;
    setStatus("accepting");
    setError(null);
    apiPost<{ ok: true; workspaceId: string }>(`/api/workspaces/${workspaceId}/invites/${inviteId}/accept`, {})
      .then(async () => {
        await refresh();
        setStatus("accepted");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setError(mapAcceptError(err instanceof Error ? err.message : "unknown"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, inviteId, user, status]);

  if (!workspaceId || !inviteId) {
    return (
      <AuthPageShell title="Invite link incomplete">
        <p className="text-sm text-muted-foreground">
          This invite link is missing information. Ask whoever invited you to send it again from their
          Team settings.
        </p>
      </AuthPageShell>
    );
  }

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        if (password.length < 8) {
          setAuthError("Password must be at least 8 characters.");
          return;
        }
        await signUp(email, password);
      }
    } catch {
      setAuthError(mode === "signin" ? "Couldn't sign in with those credentials." : "Couldn't create that account — it may already exist.");
    } finally {
      setAuthSubmitting(false);
    }
  }

  if (status === "accepted") {
    return (
      <AuthPageShell title="You're in">
        <p className="text-sm text-muted-foreground">This invite has been accepted.</p>
        <Button onClick={() => navigate("/app", { replace: true })} className="w-full">
          Go to your workspace
        </Button>
      </AuthPageShell>
    );
  }

  if (status === "error") {
    return (
      <AuthPageShell title="Couldn't accept this invite">
        <p className="text-sm text-destructive">{error}</p>
        {auth?.currentUser?.email && (
          <p className="text-sm text-muted-foreground">
            Signed in as {auth.currentUser.email}. If this invite was sent to a different address, sign
            out and sign in with that email instead.
          </p>
        )}
        <Link to="/app" className="text-sm underline">Go to your workspace</Link>
      </AuthPageShell>
    );
  }

  if (user === undefined || status === "accepting") {
    return (
      <AuthPageShell title="Accepting your invite…">
        <p className="text-sm text-muted-foreground">One moment.</p>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title={mode === "signin" ? "Sign in to accept your invite" : "Create an account to accept your invite"}
      footer={
        <button type="button" className="underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Need an account instead?" : "Already have an account?"}
        </button>
      }
    >
      {!isFirebaseConfigured && <ConfigWarning />}
      <p className="mb-3 text-sm text-muted-foreground">
        Use the email address this invite was sent to{prefillEmail ? `: ${prefillEmail}` : "."}
      </p>
      <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <Input
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </label>
        {authError && <p className="text-sm text-destructive">{authError}</p>}
        <Button type="submit" disabled={authSubmitting || !isFirebaseConfigured}>
          {authSubmitting ? "Please wait…" : mode === "signin" ? "Sign in and accept" : "Create account and accept"}
        </Button>
      </form>
    </AuthPageShell>
  );
}

function mapAcceptError(code: string): string {
  switch (code) {
    case "email_mismatch":
      return "Sign in with the email address this invite was sent to.";
    case "invite_expired":
      return "This invite has expired. Ask for a new one.";
    case "invite_not_found":
      return "This invite link is no longer valid.";
    case "invite_already_accepted":
      return "This invite was already accepted by someone else.";
    case "invite_not_available":
      return "This invite is no longer available.";
    default:
      return "Couldn't accept this invite. Try again or ask for a new link.";
  }
}
