/**
 * Project + Section domain.
 *
 * Pattern di accesso: tutte le query prendono organizationId esplicito.
 * La action layer aggiunge il guard tramite requireActiveOrganization.
 */

import { and, asc, eq, isNull, max } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Project, Section, Task } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type ProjectListItem = Project;

/** Lista progetti dell'organization, esclusi quelli archiviati e cancellati. */
export async function listProjects(opts: {
  organizationId: string;
}): Promise<ProjectListItem[]> {
  return db.query.project.findMany({
    where: and(
      eq(schema.project.organizationId, opts.organizationId),
      isNull(schema.project.archivedAt),
      isNull(schema.project.deletedAt),
    ),
    orderBy: [asc(schema.project.order), asc(schema.project.name)],
  });
}

export async function getProject(opts: {
  projectId: string;
  organizationId: string;
}): Promise<Project | null> {
  const proj = await db.query.project.findFirst({
    where: and(
      eq(schema.project.id, opts.projectId),
      eq(schema.project.organizationId, opts.organizationId),
      isNull(schema.project.deletedAt),
    ),
  });
  return proj ?? null;
}

export type CreateProjectInput = {
  organizationId: string;
  name: string;
  color?: string;
  icon?: string | null;
  isFavorite?: boolean;
  clientId?: string | null;
};

export async function createProject(input: CreateProjectInput): Promise<Project> {
  // Order = max existing + 1 (semplice, sequenziale)
  const maxRow = await db
    .select({ max: max(schema.project.order) })
    .from(schema.project)
    .where(eq(schema.project.organizationId, input.organizationId));
  const nextOrder = (maxRow[0]?.max ?? -1) + 1;

  const [created] = await db
    .insert(schema.project)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      color: input.color ?? "#808080",
      icon: input.icon ?? null,
      isFavorite: input.isFavorite ?? false,
      clientId: input.clientId ?? null,
      order: nextOrder,
    })
    .returning();
  if (!created) throw new Error("Insert project fallito");
  return created;
}

export async function renameProject(opts: {
  projectId: string;
  organizationId: string;
  name: string;
}): Promise<void> {
  await db
    .update(schema.project)
    .set({ name: opts.name })
    .where(
      and(
        eq(schema.project.id, opts.projectId),
        eq(schema.project.organizationId, opts.organizationId),
      ),
    );
}

export async function setProjectClient(opts: {
  projectId: string;
  organizationId: string;
  clientId: string | null;
}): Promise<void> {
  await db
    .update(schema.project)
    .set({ clientId: opts.clientId })
    .where(
      and(
        eq(schema.project.id, opts.projectId),
        eq(schema.project.organizationId, opts.organizationId),
      ),
    );
}

export async function archiveProject(opts: {
  projectId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .update(schema.project)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(schema.project.id, opts.projectId),
        eq(schema.project.organizationId, opts.organizationId),
      ),
    );
}

export async function toggleProjectFavorite(opts: {
  projectId: string;
  organizationId: string;
}): Promise<void> {
  const proj = await getProject(opts);
  if (!proj) return;
  await db
    .update(schema.project)
    .set({ isFavorite: !proj.isFavorite })
    .where(eq(schema.project.id, opts.projectId));
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function listSectionsForProject(opts: {
  projectId: string;
}): Promise<Section[]> {
  return db.query.section.findMany({
    where: eq(schema.section.projectId, opts.projectId),
    orderBy: [asc(schema.section.order), asc(schema.section.name)],
  });
}

export async function createSection(opts: {
  projectId: string;
  name: string;
}): Promise<Section> {
  const maxRow = await db
    .select({ max: max(schema.section.order) })
    .from(schema.section)
    .where(eq(schema.section.projectId, opts.projectId));
  const nextOrder = (maxRow[0]?.max ?? -1) + 1;

  const [created] = await db
    .insert(schema.section)
    .values({ projectId: opts.projectId, name: opts.name, order: nextOrder })
    .returning();
  if (!created) throw new Error("Insert section fallito");
  return created;
}

export async function renameSection(opts: {
  sectionId: string;
  name: string;
}): Promise<void> {
  await db
    .update(schema.section)
    .set({ name: opts.name })
    .where(eq(schema.section.id, opts.sectionId));
}

export async function deleteSection(opts: { sectionId: string }): Promise<void> {
  // Hard delete: cascade rimuove le associazioni; i task figli si "scollegano" (FK SET NULL)
  await db.delete(schema.section).where(eq(schema.section.id, opts.sectionId));
}

// ---------------------------------------------------------------------------
// Tasks per project (helper aggregato)
// ---------------------------------------------------------------------------

/**
 * Ritorna tutti i task di un project (non completati, non cancellati), raggruppati
 * per sezione. Le sezioni vengono fetchate separatamente per preservare l'ordine
 * anche quando una sezione e' vuota.
 */
export async function getProjectBoard(opts: {
  projectId: string;
  organizationId: string;
}): Promise<{
  sections: Section[];
  tasksBySection: Map<string | null, Task[]>;
}> {
  const sections = await listSectionsForProject({ projectId: opts.projectId });
  const tasks = await db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, opts.organizationId),
      eq(schema.task.projectId, opts.projectId),
      isNull(schema.task.completedAt),
      isNull(schema.task.deletedAt),
    ),
    orderBy: [asc(schema.task.order), asc(schema.task.createdAt)],
  });

  const tasksBySection = new Map<string | null, Task[]>();
  // Inizializza tutte le sezioni con array vuoto + slot "null" per task senza section
  tasksBySection.set(null, []);
  for (const s of sections) tasksBySection.set(s.id, []);

  for (const t of tasks) {
    const key = t.sectionId ?? null;
    if (!tasksBySection.has(key)) tasksBySection.set(key, []);
    tasksBySection.get(key)!.push(t);
  }

  return { sections, tasksBySection };
}
