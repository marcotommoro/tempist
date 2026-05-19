/**
 * Project membership + project-level invitation domain.
 *
 * Permette di invitare a un singolo project anche utenti **esterni** al workspace
 * del project (l'invitato vede solo quel project nella sua sidebar "Shared with me").
 */

import { and, asc, eq, gt, lt } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db, schema } from "@/lib/db";
import type { ProjectInvitation, ProjectMember } from "@/lib/db/schema";

export type ProjectRole = "editor" | "viewer";

// ---------------------------------------------------------------------------
// Project members
// ---------------------------------------------------------------------------

export type ProjectMemberWithUser = {
  id: string;
  projectId: string;
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: ProjectRole;
  createdAt: Date;
};

export async function listProjectMembers(projectId: string): Promise<ProjectMemberWithUser[]> {
  const rows = await db
    .select({
      id: schema.projectMember.id,
      projectId: schema.projectMember.projectId,
      userId: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      image: schema.user.image,
      role: schema.projectMember.role,
      createdAt: schema.projectMember.createdAt,
    })
    .from(schema.projectMember)
    .innerJoin(schema.user, eq(schema.user.id, schema.projectMember.userId))
    .where(eq(schema.projectMember.projectId, projectId))
    .orderBy(asc(schema.user.email));

  return rows.map((r) => ({ ...r, role: r.role as ProjectRole }));
}

export async function findProjectMembership(opts: {
  projectId: string;
  userId: string;
}): Promise<ProjectMember | null> {
  const row = await db.query.projectMember.findFirst({
    where: and(
      eq(schema.projectMember.projectId, opts.projectId),
      eq(schema.projectMember.userId, opts.userId),
    ),
  });
  return row ?? null;
}

/**
 * Aggiunge (o aggiorna il role di) un user come membro di un project.
 * Idempotente: se la coppia (projectId, userId) esiste già, fa un update.
 */
export async function upsertProjectMember(opts: {
  projectId: string;
  userId: string;
  role: ProjectRole;
  addedById: string;
}): Promise<ProjectMember> {
  const existing = await findProjectMembership(opts);
  if (existing) {
    const [updated] = await db
      .update(schema.projectMember)
      .set({ role: opts.role })
      .where(eq(schema.projectMember.id, existing.id))
      .returning();
    if (!updated) throw new Error("Upsert project_member fallito");
    return updated;
  }
  const [created] = await db
    .insert(schema.projectMember)
    .values({
      projectId: opts.projectId,
      userId: opts.userId,
      role: opts.role,
      addedById: opts.addedById,
    })
    .returning();
  if (!created) throw new Error("Insert project_member fallito");
  return created;
}

export async function removeProjectMember(opts: {
  projectId: string;
  userId: string;
}): Promise<void> {
  await db
    .delete(schema.projectMember)
    .where(
      and(
        eq(schema.projectMember.projectId, opts.projectId),
        eq(schema.projectMember.userId, opts.userId),
      ),
    );
}

export async function updateProjectMemberRole(opts: {
  projectId: string;
  userId: string;
  role: ProjectRole;
}): Promise<void> {
  await db
    .update(schema.projectMember)
    .set({ role: opts.role })
    .where(
      and(
        eq(schema.projectMember.projectId, opts.projectId),
        eq(schema.projectMember.userId, opts.userId),
      ),
    );
}

/** Lista i project_id a cui un utente ha accesso esplicito (esterni al workspace). */
export async function listSharedProjectIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ projectId: schema.projectMember.projectId })
    .from(schema.projectMember)
    .where(eq(schema.projectMember.userId, userId));
  return rows.map((r) => r.projectId);
}

// ---------------------------------------------------------------------------
// Project invitations
// ---------------------------------------------------------------------------

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni

export async function listProjectInvitations(projectId: string): Promise<ProjectInvitation[]> {
  return db.query.projectInvitation.findMany({
    where: and(
      eq(schema.projectInvitation.projectId, projectId),
      eq(schema.projectInvitation.status, "pending"),
    ),
    orderBy: [asc(schema.projectInvitation.email)],
  });
}

export async function findInvitationByToken(token: string): Promise<ProjectInvitation | null> {
  const row = await db.query.projectInvitation.findFirst({
    where: eq(schema.projectInvitation.token, token),
  });
  return row ?? null;
}

export async function findPendingInvitationByEmail(opts: {
  projectId: string;
  email: string;
}): Promise<ProjectInvitation | null> {
  const row = await db.query.projectInvitation.findFirst({
    where: and(
      eq(schema.projectInvitation.projectId, opts.projectId),
      eq(schema.projectInvitation.email, opts.email.toLowerCase()),
      eq(schema.projectInvitation.status, "pending"),
    ),
  });
  return row ?? null;
}

/**
 * Crea (o ri-crea) un invito project-level. Se esiste già un invito pending
 * per questa (project, email), aggiorna `expiresAt` + token invece di duplicare.
 */
export async function createOrRefreshProjectInvitation(opts: {
  projectId: string;
  email: string;
  role: ProjectRole;
  inviterId: string;
}): Promise<ProjectInvitation> {
  const email = opts.email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  const token = nanoid(32);

  const existing = await findPendingInvitationByEmail({ projectId: opts.projectId, email });
  if (existing) {
    const [refreshed] = await db
      .update(schema.projectInvitation)
      .set({ role: opts.role, expiresAt, token, inviterId: opts.inviterId })
      .where(eq(schema.projectInvitation.id, existing.id))
      .returning();
    if (!refreshed) throw new Error("Refresh project_invitation fallito");
    return refreshed;
  }

  const [created] = await db
    .insert(schema.projectInvitation)
    .values({
      projectId: opts.projectId,
      email,
      role: opts.role,
      token,
      expiresAt,
      inviterId: opts.inviterId,
    })
    .returning();
  if (!created) throw new Error("Insert project_invitation fallito");
  return created;
}

export async function cancelProjectInvitation(invitationId: string): Promise<void> {
  await db
    .delete(schema.projectInvitation)
    .where(eq(schema.projectInvitation.id, invitationId));
}

/**
 * Accetta un invito: crea (o aggiorna) project_member e marca l'invito come accepted.
 * Assume che `invitation` esista, sia pending e non scaduta — i check sono nell'action.
 */
export async function acceptProjectInvitation(opts: {
  invitation: ProjectInvitation;
  userId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    // Idempotente: se esiste membership, aggiorna solo il role
    const existing = await tx.query.projectMember.findFirst({
      where: and(
        eq(schema.projectMember.projectId, opts.invitation.projectId),
        eq(schema.projectMember.userId, opts.userId),
      ),
    });
    if (existing) {
      await tx
        .update(schema.projectMember)
        .set({ role: opts.invitation.role })
        .where(eq(schema.projectMember.id, existing.id));
    } else {
      await tx.insert(schema.projectMember).values({
        projectId: opts.invitation.projectId,
        userId: opts.userId,
        role: opts.invitation.role,
        addedById: opts.invitation.inviterId,
      });
    }
    await tx
      .update(schema.projectInvitation)
      .set({ status: "accepted" })
      .where(eq(schema.projectInvitation.id, opts.invitation.id));
  });
}

/** Marca come expired gli inviti scaduti (cleanup utility, chiamato dall'accept page). */
export async function markExpiredInvitations(): Promise<void> {
  await db
    .update(schema.projectInvitation)
    .set({ status: "expired" })
    .where(
      and(
        eq(schema.projectInvitation.status, "pending"),
        lt(schema.projectInvitation.expiresAt, new Date()),
      ),
    );
}

export function isInvitationExpired(invitation: ProjectInvitation): boolean {
  return invitation.expiresAt.getTime() < Date.now();
}

// Re-export helper utile per chi vuole sapere se "rimangono inviti validi"
export async function hasValidPendingInvitations(projectId: string): Promise<boolean> {
  const row = await db.query.projectInvitation.findFirst({
    where: and(
      eq(schema.projectInvitation.projectId, projectId),
      eq(schema.projectInvitation.status, "pending"),
      gt(schema.projectInvitation.expiresAt, new Date()),
    ),
  });
  return !!row;
}
