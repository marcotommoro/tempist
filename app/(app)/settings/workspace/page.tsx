import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { db, schema } from "@/lib/db";
import {
  canDeleteWorkspace,
  listPendingWorkspaceInvitations,
  listWorkspaceMembers,
} from "@/lib/domain/workspaces";
import { PageHeader } from "@/components/features/page-header/page-header";
import { InviteMemberForm } from "@/components/features/workspaces/invite-member-form";
import { MembersTable } from "@/components/features/workspaces/members-table";
import { PendingInvitationsList } from "@/components/features/workspaces/pending-invitations-list";
import { DeleteWorkspaceDialog } from "@/components/features/workspaces/delete-workspace-dialog";

export default async function WorkspaceSettingsPage() {
  const { user, organizationId, role } = await requireActiveOrganization();

  const [org, members, pendingInvitations, deletable] = await Promise.all([
    db.query.organization.findFirst({ where: eq(schema.organization.id, organizationId) }),
    listWorkspaceMembers(organizationId),
    listPendingWorkspaceInvitations(organizationId),
    canDeleteWorkspace(user.id),
  ]);

  if (!org) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Workspace non trovato.</p>
      </div>
    );
  }

  const canManage = role === "owner" || role === "admin";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-1 text-eyebrow hover:text-foreground"
        >
          <ChevronLeft className="size-3" /> Settings
        </Link>
        <PageHeader
          eyebrow={
            <span className="text-eyebrow">
              {role}
            </span>
          }
          title={org.name}
          meta={
            <span>
              {org.slug ? <code className="font-mono">{org.slug}</code> : "no slug"}
            </span>
          }
        />
      </div>

      <section className="space-y-3">
        <header>
          <h2 className="font-display text-lg text-foreground">Membri</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "persona" : "persone"} nel workspace.
          </p>
        </header>
        <MembersTable members={members} currentUserId={user.id} canManage={canManage} />
      </section>

      {canManage && (
        <section className="space-y-3">
          <header>
            <h2 className="font-display text-lg text-foreground">Invita</h2>
            <p className="text-sm text-muted-foreground">
              L&apos;invitato riceverà un&apos;email per accedere al workspace.
            </p>
          </header>
          <InviteMemberForm />
        </section>
      )}

      <section className="space-y-3">
        <header>
          <h2 className="font-display text-lg text-foreground">Inviti in sospeso</h2>
          <p className="text-sm text-muted-foreground">
            Inviti spediti non ancora accettati.
          </p>
        </header>
        <PendingInvitationsList invitations={pendingInvitations} canManage={canManage} />
      </section>

      {role === "owner" && (
        <section className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <header>
            <h2 className="font-display text-lg text-destructive">Danger zone</h2>
            <p className="text-sm text-muted-foreground">
              L&apos;eliminazione del workspace è irreversibile.{" "}
              {!deletable && (
                <strong className="text-destructive">
                  Non puoi eliminare il tuo unico workspace.
                </strong>
              )}
            </p>
          </header>
          {deletable && (
            <DeleteWorkspaceDialog workspaceId={org.id} workspaceName={org.name} />
          )}
        </section>
      )}
    </div>
  );
}
