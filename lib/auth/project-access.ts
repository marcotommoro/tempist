/**
 * Guard di accesso a livello project.
 *
 * Un utente può accedere a un project se:
 *  - è membro del workspace del project (via `member`), OPPURE
 *  - è membro del project (via `project_member` — invito esterno)
 *
 * I workspace member hanno automaticamente role 'editor' (eccetto i 'viewer'
 * che oggi non esistono a livello workspace — riservato a future expansion).
 * I project member usano il role della loro riga `project_member`.
 */

import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Project } from "@/lib/db/schema";
import type { ProjectRole } from "@/lib/domain/project-members";
import { requireSession } from "./workspace";

type SessionUser = Awaited<ReturnType<typeof requireSession>>["user"];

export type ProjectAccess = {
  user: SessionUser;
  project: Project;
  /** 'workspace' = è membro del workspace del project; 'project' = solo project-level. */
  accessType: "workspace" | "project";
  /** Role effettivo per il branching UI. workspace member -> 'editor'. */
  role: ProjectRole;
};

/**
 * Garantisce accesso al project. Se l'utente non è loggato → redirect /sign-in.
 * Se è loggato ma non ha accesso → 404 (nasconde l'esistenza del project,
 * più sicuro di un 403 esplicito che leakerebbe info).
 */
export async function requireProjectAccess(projectId: string): Promise<ProjectAccess> {
  const session = await requireSession();
  const userId = session.user.id;

  const project = await db.query.project.findFirst({
    where: and(eq(schema.project.id, projectId), isNull(schema.project.deletedAt)),
  });
  if (!project) notFound();

  // 1) workspace membership?
  const workspaceMember = await db.query.member.findFirst({
    where: and(
      eq(schema.member.userId, userId),
      eq(schema.member.organizationId, project.organizationId),
    ),
  });
  if (workspaceMember) {
    return {
      user: session.user,
      project,
      accessType: "workspace",
      role: "editor",
    };
  }

  // 2) project membership?
  const projectMember = await db.query.projectMember.findFirst({
    where: and(eq(schema.projectMember.projectId, projectId), eq(schema.projectMember.userId, userId)),
  });
  if (projectMember) {
    return {
      user: session.user,
      project,
      accessType: "project",
      role: projectMember.role as ProjectRole,
    };
  }

  notFound();
}

/** Hard-enforce un role specifico (per mutation). */
export function assertProjectRole(role: ProjectRole, allowed: readonly ProjectRole[]): void {
  if (!allowed.includes(role)) {
    redirect("/today");
  }
}
