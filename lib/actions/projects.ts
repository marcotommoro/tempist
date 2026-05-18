"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  archiveProject,
  createProject,
  createSection,
  deleteSection,
  renameProject,
  renameSection,
  toggleProjectFavorite,
} from "@/lib/domain/projects";
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
});

export async function createProjectAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const parsed = createProjectSchema.safeParse({
      name: formData.get("name"),
      color: formData.get("color") || undefined,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }
    const project = await createProject({
      organizationId,
      name: parsed.data.name,
      color: parsed.data.color,
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
