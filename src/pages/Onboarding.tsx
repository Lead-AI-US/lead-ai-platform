import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiPost } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import type { Workspace } from "@/types/workspace";

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function Onboarding() {
  const navigate = useNavigate();
  const { refresh } = useWorkspace();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [websiteDomain, setWebsiteDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost<{ workspace: Workspace }>("/api/workspaces", {
        businessName,
        businessType,
        timezone: DEFAULT_TIMEZONE,
        primaryGoal,
        websiteDomain: websiteDomain || undefined,
      });
      await refresh();
      navigate("/app", { replace: true });
    } catch {
      setError("Couldn't create your workspace. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Set up your workspace</h1>
          <p className="text-sm text-muted-foreground">A few details about your business to get started.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Business name
            <Input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Business type
            <Input
              required
              placeholder="e.g. dental clinic, law firm, home services"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Primary goal
            <Input
              required
              placeholder="e.g. capture more leads after hours"
              value={primaryGoal}
              onChange={(e) => setPrimaryGoal(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Website domain <span className="text-muted-foreground">(optional)</span>
            <Input placeholder="example.com" value={websiteDomain} onChange={(e) => setWebsiteDomain(e.target.value)} />
          </label>
          <p className="text-xs text-muted-foreground">Timezone detected as {DEFAULT_TIMEZONE}.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating workspace…" : "Create workspace"}
          </Button>
        </form>
      </div>
    </div>
  );
}
