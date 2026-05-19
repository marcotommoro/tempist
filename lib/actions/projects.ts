"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertProjectRole, requireProjectAccess } from "@/lib/auth/project-access";
import { requireActiveOrganization, requireSession } from "@/lib/auth/workspace";
import {
  acceptProjectInvitation,
  cancelProjectInvitation as cancelProjectInvitationDomain,
  createOrRefreshProjectInvitation,
  findInvitationByToken,
  isInvitationExpired,
  removeProjectMember,
  updateProjectMemberRole,
  upsertProjectMember,
  type ProjectRole,
} from "@/lib/domain/project-members";
import {
  archiveProject,
  createProject,
  createSection,
  deleteSection,
  renameProject,
  renameSection,
  setProjectClient,
  setProjectDescription,
  toggleProjectFavorite,
} from "@/lib/domain/projects";
import { findWorkspaceMemberByEmail } from "@/lib/domain/workspaces";
import { sendProjectInviteEmail } from "@/lib/email/send-invite";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { ActionResult } from "./tasks";

function revalidateProjects(projectId?: string) {
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  // La sidebar e' in app layout — revalidate root
  revalidatePath("/", "layout");
}

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Nome richiesto").max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/u, "Colore deve essere hex #RRGGBB")
    .optional(),
  clientId: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .transform((v) => (v && v !== "null" ? v : null)),
});

export async function createProjectAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const parsed = createProjectSchema.safeParse({
      name: formData.get("name"),
      color: formData.get("color") || undefined,
      clientId: formData.get("clientId") || undefined,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }
    const project = await createProject({
      organizationId,
      name: parsed.data.name,
      color: parsed.data.color,
      clientId: parsed.data.clientId,
    });
    revalidateProjects(project.id);
    return { ok: true, data: { id: project.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function renameProjectAction(
  projectId: string,
  newName: string,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const name = newName.trim();
    if (!name) return { ok: false, error: "Nome vuoto" };
    await renameProject({ projectId, organizationId, name });
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function setProjectClientAction(
  projectId: string,
  clientId: string | null,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    await setProjectClient({ projectId, organizationId, clientId });
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function toggleProjectFavoriteAction(
  projectId: string,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    await toggleProjectFavorite({ projectId, organizationId });
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function archiveProjectAction(
  projectId: string,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    await archiveProject({ projectId, organizationId });
    revalidateProjects();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

// --- Sections ---

export async function createSectionAction(
  projectId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireActiveOrganization();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { ok: false, error: "Nome sezione richiesto" };
    if (name.length > 80) return { ok: false, error: "Nome sezione troppo lungo" };
    const section = await createSection({ projectId, name });
    revalidateProjects(projectId);
    return { ok: true, data: { id: section.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function renameSectionAction(
  sectionId: string,
  projectId: string,
  newName: string,
): Promise<ActionResult> {
  try {
    await requireActiveOrganization();
    const name = newName.trim();
    if (!name) return { ok: false, error: "Nome vuoto" };
    await renameSection({ sectionId, name });
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function deleteSectionAction(
  sectionId: string,
  projectId: string,
): Promise<ActionResult> {
  try {
    await requireActiveOrganization();
    await deleteSection({ sectionId });
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

// ---------------------------------------------------------------------------
// Project description
// ---------------------------------------------------------------------------

const descriptionSchema = z
  .string()
  .max(10_000, "Descrizione troppo lunga (max 10k caratteri)")
  .nullable();

export async function setProjectDescriptionAction(
  projectId: string,
  description: string | null,
): Promise<ActionResult> {
  try {
    const { role } = await requireProjectAccess(projectId);
    assertProjectRole(role, ["editor"]);
    const parsed = descriptionSchema.safeParse(description);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Input non valido" };
    }
    await setProjectDescription({ projectId, description: parsed.data });
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

// ---------------------------------------------------------------------------
// Project invites & members
// ---------------------------------------------------------------------------

const inviteToProjectSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email non valida"),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

/**
 * Invita una persona al project. Solo workspace member del project possono.
 * **Fast-path**: se l'email è già un workspace member, aggiunge direttamente a
 * project_member (no email). Altrimenti crea/refresha un project_invitation e
 * manda l'email con il token.
 */
export async function inviteToProjectAction(
  projectId: string,
  formData: FormData,
): Promise<ActionResult<{ kind: "direct" | "invited" }>> {
  try {
    const access = await requireProjectAccess(projectId);
    if (access.accessType !== "workspace") {
      return { ok: false, error: "Solo i membri del workspace possono invitare al project" };
    }
    const parsed = inviteToProjectSchema.safeParse({
      email: formData.get("email"),
      role: formData.get("role") || "editor",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Input non valido" };
    }
    const { email, role } = parsed.data;

    const workspaceMember = await findWorkspaceMemberByEmail({
      organizationId: access.project.organizationId,
      email,
    });

    if (workspaceMember) {
      // Fast-path: già nel workspace, basta dargli accesso al singolo project
      if (workspaceMember.userId === access.user.id) {
        return { ok: false, error: "Hai già accesso a questo project" };
      }
      await upsertProjectMember({
        projectId,
        userId: workspaceMember.userId,
        role,
        addedById: access.user.id,
      });
      revalidateProjects(projectId);
      return { ok: true, data: { kind: "direct" } };
    }

    const invitation = await createOrRefreshProjectInvitation({
      projectId,
      email,
      role,
      inviterId: access.user.id,
    });

    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const acceptUrl = `${base}/invitations/project/${invitation.token}`;
    const inviterName = access.user.name ?? access.user.email;

    await sendProjectInviteEmail({
      to: email,
      inviterName,
      projectName: access.project.name,
      acceptUrl,
    });

    revalidateProjects(projectId);
    return { ok: true, data: { kind: "invited" } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function removeProjectMemberAction(
  projectId: string,
  userId: string,
): Promise<ActionResult> {
  try {
    const access = await requireProjectAccess(projectId);
    if (access.accessType !== "workspace") {
      return { ok: false, error: "Non autorizzato" };
    }
    await removeProjectMember({ projectId, userId });
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

const updateMemberRoleSchema = z.enum(["editor", "viewer"]);

export async function updateProjectMemberRoleAction(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<ActionResult> {
  try {
    const access = await requireProjectAccess(projectId);
    if (access.accessType !== "workspace") {
      return { ok: false, error: "Non autorizzato" };
    }
    const parsed = updateMemberRoleSchema.safeParse(role);
    if (!parsed.success) return { ok: false, error: "Role non valido" };
    await updateProjectMemberRole({ projectId, userId, role: parsed.data });
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function cancelProjectInvitationAction(
  projectId: string,
  invitationId: string,
): Promise<ActionResult> {
  try {
    const access = await requireProjectAccess(projectId);
    if (access.accessType !== "workspace") {
      return { ok: false, error: "Non autorizzato" };
    }
    await cancelProjectInvitationDomain(invitationId);
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

/**
 * Usato dalla pagina pubblica /invitations/project/[token].
 * Validazione: token esiste, pending, non scaduto, email match user loggato,
 * project non cancellato. In caso di success → redirect al project.
 */
export async function acceptProjectInvitationAction(token: string): Promise<ActionResult> {
  let redirectTo: string | null = null;
  try {
    const session = await requireSession();
    const invitation = await findInvitationByToken(token);
    if (!invitation) return { ok: false, error: "Invito non trovato" };
    if (invitation.status !== "pending") {
      return { ok: false, error: `Invito ${invitation.status}` };
    }
    if (isInvitationExpired(invitation)) {
      // Best-effort: marca come expired per UX successive
      await db
        .update(schema.projectInvitation)
        .set({ status: "expired" })
        .where(eq(schema.projectInvitation.id, invitation.id));
      return { ok: false, error: "Invito scaduto" };
    }
    if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return {
        ok: false,
        error: `Sei loggato come ${session.user.email}, l'invito è per ${invitation.email}`,
      };
    }
    await acceptProjectInvitation({ invitation, userId: session.user.id });
    redirectTo = `/projects/${invitation.projectId}`;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
  if (redirectTo) redirect(redirectTo);
  return { ok: true, data: undefined };
}
