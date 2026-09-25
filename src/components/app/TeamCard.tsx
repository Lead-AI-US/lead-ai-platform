import { useEffect, useState, type FormEvent } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { roleAtLeast, type WorkspaceMember, type WorkspaceRole } from "@/types/workspace";
import type { WorkspaceInvite } from "@/types/invite";

const ROLE_OPTIONS: WorkspaceRole[] = ["viewer", "member", "admin", "owner"];
const ROLE_TONE: Record<WorkspaceRole, "neutral" | "info" | "success"> = {
  viewer: "neutral",
  member: "neutral",
  admin: "info",
  owner: "success",
};

export function TeamCard({
  workspaceId,
  ownRole,
  ownUid,
  onLeft,
}: {
  workspaceId: string;
  ownRole: WorkspaceRole;
  ownUid: string;
  /** Called after a successful self-service leave — the caller decides where to send the user. */
  onLeft: () => void;
}) {
  const [members, setMembers] = useState<WorkspaceMember[] | null>(null);
  const [invites, setInvites] = useState<WorkspaceInvite[] | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const canManage = roleAtLeast(ownRole, "admin");
  const invitableRoles = ownRole === "owner" ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r !== "owner");

  async function load() {
    setError(null);
    try {
      const membersRes = await apiGet<{ members: WorkspaceMember[] }>(`/api/workspaces/${workspaceId}/members`);
      setMembers(membersRes.members);
      if (canManage) {
        const invitesRes = await apiGet<{ invites: WorkspaceInvite[] }>(`/api/workspaces/${workspaceId}/invites`);
        setInvites(invitesRes.invites);
      }
    } catch {
      setError("Couldn't load team members.");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  function inviteLink(invite: WorkspaceInvite): string {
    const params = new URLSearchParams({ workspaceId, inviteId: invite.id, email: invite.email });
    return `${window.location.origin}/accept-invite?${params.toString()}`;
  }

  async function copyInviteLink(invite: WorkspaceInvite) {
    try {
      await navigator.clipboard.writeText(inviteLink(invite));
      setCopiedInviteId(invite.id);
      setTimeout(() => setCopiedInviteId(null), 2000);
    } catch {
      setError("Couldn't copy the link — clipboard access isn't available here.");
    }
  }

  async function sendInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiPost(`/api/workspaces/${workspaceId}/invites`, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error && err.message === "invite_already_pending"
        ? "An invite is already pending for that email."
        : err instanceof Error && err.message === "already_a_member"
        ? "That email already belongs to a member of this workspace."
        : "Couldn't send that invite.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    setError(null);
    try {
      await apiDelete(`/api/workspaces/${workspaceId}/invites/${inviteId}`);
      await load();
    } catch {
      setError("Couldn't revoke that invite.");
    }
  }

  async function changeRole(userId: string, role: WorkspaceRole) {
    setError(null);
    try {
      await apiPatch(`/api/workspaces/${workspaceId}/members/${userId}`, { role });
      await load();
    } catch (err) {
      setError(err instanceof Error && err.message === "last_owner" ? "A workspace must keep at least one active owner." : "Couldn't change that member's role.");
    }
  }

  async function toggleStatus(userId: string, status: "active" | "disabled") {
    setError(null);
    try {
      await apiPatch(`/api/workspaces/${workspaceId}/members/${userId}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error && err.message === "last_owner" ? "A workspace must keep at least one active owner." : "Couldn't update that membership.");
    }
  }

  function canManageTarget(target: WorkspaceMember): boolean {
    if (!canManage) return false;
    if (target.role === "owner" || target.role === "admin") return ownRole === "owner";
    return true;
  }

  async function leaveWorkspace() {
    setError(null);
    setLeaving(true);
    try {
      await apiPost(`/api/workspaces/${workspaceId}/leave`, {});
      onLeft();
    } catch (err) {
      setError(
        err instanceof Error && err.message === "last_owner"
          ? "Transfer ownership to another member before leaving — a workspace must keep at least one active owner."
          : "Couldn't leave this workspace."
      );
      setConfirmLeave(false);
    } finally {
      setLeaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          {members === null && <p className="text-sm text-muted-foreground">Loading…</p>}
          {members?.map((member) => (
            <div
              key={member.userId}
              data-testid={`member-row-${member.userId}`}
              className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="text-sm font-medium">{member.email || member.userId}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {member.userId === ownUid && "You"}
                  {member.status === "disabled" && <Badge tone="danger">Disabled</Badge>}
                </div>
              </div>
              {canManageTarget(member) ? (
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`role-${member.userId}`}>Role for {member.email || member.userId}</label>
                  <select
                    id={`role-${member.userId}`}
                    value={member.role}
                    onChange={(e) => void changeRole(member.userId, e.target.value as WorkspaceRole)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {(ownRole === "owner" ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r !== "owner" && r !== "admin")).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void toggleStatus(member.userId, member.status === "active" ? "disabled" : "active")}
                    className="px-2 py-1 text-xs"
                  >
                    {member.status === "active" ? "Disable" : "Re-enable"}
                  </Button>
                </div>
              ) : (
                <Badge tone={ROLE_TONE[member.role]}>{member.role}</Badge>
              )}
            </div>
          ))}
        </div>

        {canManage && (
          <>
            {invites && invites.length > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-medium">Pending invites</p>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    data-testid={`invite-row-${invite.id}`}
                    className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-sm">{invite.email}</div>
                      <Badge tone={ROLE_TONE[invite.role]}>{invite.role}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="secondary" onClick={() => void copyInviteLink(invite)} className="px-2 py-1 text-xs">
                        {copiedInviteId === invite.id ? "Copied" : "Copy invite link"}
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => void revokeInvite(invite.id)} className="px-2 py-1 text-xs">
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={sendInvite} className="space-y-2 border-t border-border pt-4">
              <p className="text-sm font-medium">Invite a teammate</p>
              <p className="text-xs text-muted-foreground">
                No email is sent automatically — copy the generated link after inviting and share it yourself.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="invite-email">Email to invite</label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="teammate@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <label className="sr-only" htmlFor="invite-role">Role to invite as</label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {invitableRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <Button type="submit" disabled={busy}>
                  Invite
                </Button>
              </div>
            </form>
          </>
        )}

        <div className="border-t border-border pt-4">
          {confirmLeave ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm">Leave this workspace? You'll lose access immediately.</p>
              <Button type="button" variant="destructive" disabled={leaving} onClick={() => void leaveWorkspace()} className="px-3 py-1 text-xs">
                {leaving ? "Leaving…" : "Confirm leave"}
              </Button>
              <Button type="button" variant="secondary" disabled={leaving} onClick={() => setConfirmLeave(false)} className="px-3 py-1 text-xs">
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setConfirmLeave(true)} className="px-3 py-1 text-xs">
              Leave workspace
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
