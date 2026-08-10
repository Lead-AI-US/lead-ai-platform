import { useState, type FormEvent } from "react";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { apiPatch } from "@/lib/api/client";
import { PageHeader } from "@/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { roleAtLeast } from "@/types/workspace";
import { widgetSnippet } from "@/lib/workspace/widgetSnippet";

export default function Settings() {
  const { workspace, role, refresh } = useWorkspace();
  const [newOrigin, setNewOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = role ? roleAtLeast(role, "admin") : false;

  if (!workspace) return null;

  async function addOrigin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const next = Array.from(new Set([...workspace!.allowedOrigins, newOrigin.trim()]));
      await apiPatch(`/api/workspaces/${workspace!.id}`, { allowedOrigins: next });
      setNewOrigin("");
      await refresh();
    } catch {
      setError("Couldn't save that origin — make sure it's a full URL like https://example.com.");
    } finally {
      setSaving(false);
    }
  }

  async function removeOrigin(origin: string) {
    const next = workspace!.allowedOrigins.filter((o) => o !== origin);
    await apiPatch(`/api/workspaces/${workspace!.id}`, { allowedOrigins: next });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Workspace configuration, widget installation, security posture, and developer setup."
      />

      <Card>
        <CardHeader>
          <CardTitle>Allowed website origins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The chat widget only responds to requests from these origins. This is a deny-by-default allowlist, not a
            secret.
          </p>
          <div className="flex flex-wrap gap-2">
            {workspace.allowedOrigins.length === 0 && (
              <p className="text-sm text-muted-foreground">No origins configured yet — the widget won't respond anywhere.</p>
            )}
            {workspace.allowedOrigins.map((origin) => (
              <Badge key={origin} className="gap-2">
                {origin}
                {canManage && (
                  <button onClick={() => void removeOrigin(origin)} className="ml-1 text-muted-foreground hover:text-foreground">
                    ×
                  </button>
                )}
              </Badge>
            ))}
          </div>
          {canManage && (
            <form onSubmit={addOrigin} className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="allowed-origin">Allowed origin</label>
              <Input id="allowed-origin" placeholder="https://example-business.com" value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)} required />
              <Button type="submit" disabled={saving}>
                Add
              </Button>
            </form>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install the widget</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-sm text-muted-foreground">
            Paste this before <code>&lt;/body&gt;</code> on an allowed origin above.
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            <code>{widgetSnippet(workspace.publicWidgetKey)}</code>
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Authentication is handled by Firebase Auth and server-verified tokens.</p>
          <p>Workspace data remains tenant-scoped by workspace membership and Firestore rules.</p>
          <p>Provider secrets must stay server-side and are not exposed in this UI.</p>
        </CardContent>
      </Card>
    </div>
  );
}
