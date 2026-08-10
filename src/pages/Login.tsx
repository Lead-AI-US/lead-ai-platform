import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function Login() {
  const { user, signIn, isFirebaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      setError("Couldn't sign in with those credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell title="Sign in" footer={<Link to="/signup" className="underline">Create an account</Link>}>
      {!isFirebaseConfigured && <ConfigWarning />}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting || !isFirebaseConfigured}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthPageShell>
  );
}

export function AuthPageShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        {children}
        {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}

export function ConfigWarning() {
  return (
    <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
      Firebase isn't configured in this environment yet (missing VITE_FIREBASE_* variables). Sign-in is
      disabled until that's set — see docs/LOCAL_DEVELOPMENT.md.
    </p>
  );
}
