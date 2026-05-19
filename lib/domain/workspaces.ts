/**
 * Workspace (a.k.a. Organization) domain.
 *
 * Wrap delle tabelle `organization` / `member` / `invitation` (Better Auth).
 * Le mutation strutturali (create/delete/update org, invite/remove/role)
 * vengono fatte tramite `auth.api.*` dal layer `lib/actions/workspaces.ts`,
 * così Better Auth aggiorna correttamente sessione, cookie e cache interna.
 * Qui dentro stanno solo le query di lettura + i guard di business logic.
 */

import { and, asc, eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Organization } from "@/lib/db/schema";

export type WorkspaceRole = "owner" | "admin" | "member";

export type MyWorkspace = Organization & { role: WorkspaceRole };

export async function listMyWorkspaces(userId: string): Promise<MyWorkspace[]> {
  const rows = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      logo: schema.organization.logo,
      metadata: schema.organization.metadata,
      createdAt: schema.organization.createdAt,
      role: schema.member.role,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
    .where(eq(schema.member.userId, userId))
    .orderBy(asc(schema.organization.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    logo: r.logo,
    metadata: r.metadata,
    createdAt: r.createdAt,
    role: r.role as WorkspaceRole,
  }));
}

export async function countMyWorkspaces(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.member)
    .where(eq(schema.member.userId, userId));
  return row?.count ?? 0;
}

/**
 * Vincolo di business: l'utente non può eliminare un workspace se è l'unico
 * a cui appartiene. Garantisce non-zero-workspace senza richiedere un flag
 * `is_personal` in schema (decisione presa nel design).
 */
export async function canDeleteWorkspace(userId: string): Promise<boolean> {
  const count = await countMyWorkspaces(userId);
  return count > 1;
}

export type WorkspaceMember = {
  memberId: string;
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: WorkspaceRole;
  createdAt: Date;
};

export async function listWorkspaceMembers(organizationId: string): Promise<WorkspaceMember[]> {
  const rows = await db
    .select({
      memberId: schema.member.id,
      userId: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      image: schema.user.image,
      role: schema.member.role,
      createdAt: schema.member.createdAt,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(eq(schema.member.organizationId, organizationId))
    .orderBy(asc(schema.user.email));

  return rows.map((r) => ({ ...r, role: r.role as WorkspaceRole }));
}

export function isWorkspaceInvitationExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

export type WorkspacePendingInvitation = {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: string;
  expiresAt: Date;
  inviterId: string;
};

export async function listPendingWorkspaceInvitations(
  organizationId: string,
): Promise<WorkspacePendingInvitation[]> {
  const rows = await db
    .select({
      id: schema.invitation.id,
      email: schema.invitation.email,
      role: schema.invitation.role,
      status: schema.invitation.status,
      expiresAt: schema.invitation.expiresAt,
      inviterId: schema.invitation.inviterId,
    })
    .from(schema.invitation)
    .where(
      and(
        eq(schema.invitation.organizationId, organizationId),
        eq(schema.invitation.status, "pending"),
      ),
    )
    .orderBy(asc(schema.invitation.email));

  return rows.map((r) => ({ ...r, role: r.role as WorkspaceRole }));
}

/**
 * Cerca un membro del workspace dato l'email. Utile per il "fast path" degli
 * inviti a un project: se l'invitato è già nel workspace, lo aggiungiamo
 * direttamente al project_member senza mandare email.
 */
export async function findWorkspaceMemberByEmail(opts: {
  organizationId: string;
  email: string;
}): Promise<{ userId: string } | null> {
  const row = await db
    .select({ userId: schema.user.id })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(
      and(
        eq(schema.member.organizationId, opts.organizationId),
        eq(schema.user.email, opts.email.toLowerCase()),
      ),
    )
    .limit(1);

  return row[0] ?? null;
}
