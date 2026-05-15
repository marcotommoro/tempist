/**
 * Task domain — Drizzle query helpers.
 *
 * Server-side only. Tutti i metodi prendono `organizationId` esplicito — le
 * action layer in `lib/actions/tasks.ts` aggiungono il guard `requireActiveOrganization`.
 *
 * Timestamps: i campi `scheduledAt`/`completedAt`/etc. sono UTC nel DB; la
 * conversione tz avviene qui per i bound dei range (today/upcoming).
 */

import { and, asc, desc, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { db, schema } from "@/lib/db";
import type { Task } from "@/lib/db/schema";

// ----------------------------------------------------------------------------
// Boundary helpers
// ----------------------------------------------------------------------------

/**
 * Ritorna {startUtc, endUtc}: gli istanti UTC che corrispondono a
 * "inizio oggi" e "fine oggi" nella timezone dell'utente.
 */
export function todayBoundsUtc(timezone: string, now: Date = new Date()): {
  startUtc: Date;
  endUtc: Date;
} {
  const nowLocal = toZonedTime(now, timezone);
  const startLocal = startOfDay(nowLocal);
  const endLocal = endOfDay(nowLocal);
  return {
    startUtc: fromZonedTime(startLocal, timezone),
    endUtc: fromZonedTime(endLocal, timezone),
  };
}

// ----------------------------------------------------------------------------
// Queries
// ----------------------------------------------------------------------------

export type ListContext = {
  organizationId: string;
};

/**
 * Today: task non completati con scheduledAt nel range "fino a fine giornata utente".
 * Include intenzionalmente gli overdue (scheduledAt nel passato e non completati).
 */
export async function getTodayTasks(
  ctx: ListContext & { timezone: string },
): Promise<Task[]> {
  const { endUtc } = todayBoundsUtc(ctx.timezone);
  return db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, ctx.organizationId),
      isNull(schema.task.completedAt),
      isNull(schema.task.deletedAt),
      isNotNull(schema.task.scheduledAt),
      lt(schema.task.scheduledAt, endUtc),
    ),
    orderBy: [asc(schema.task.scheduledAt), asc(schema.task.order)],
  });
}

/**
 * Inbox: task senza project, non completati, non cancellati.
 */
export async function getInboxTasks(ctx: ListContext): Promise<Task[]> {
  return db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, ctx.organizationId),
      isNull(schema.task.projectId),
      isNull(schema.task.completedAt),
      isNull(schema.task.deletedAt),
    ),
    orderBy: [asc(schema.task.order), desc(schema.task.createdAt)],
  });
}

/**
 * Upcoming: task con scheduledAt > fine di oggi, entro `horizonDays` giorni.
 */
export async function getUpcomingTasks(
  ctx: ListContext & { timezone: string; horizonDays?: number },
): Promise<Task[]> {
  const { endUtc } = todayBoundsUtc(ctx.timezone);
  const horizonUtc = addDays(endUtc, ctx.horizonDays ?? 30);
  return db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, ctx.organizationId),
      isNull(schema.task.completedAt),
      isNull(schema.task.deletedAt),
      gte(schema.task.scheduledAt, endUtc),
      lt(schema.task.scheduledAt, horizonUtc),
    ),
    orderBy: [asc(schema.task.scheduledAt)],
  });
}

// ----------------------------------------------------------------------------
// Mutations
// ----------------------------------------------------------------------------

export type CreateTaskInput = {
  organizationId: string;
  createdById: string;
  title: string;
  descriptionMarkdown?: string | null;
  priority?: "P1" | "P2" | "P3" | "P4";
  scheduledAt?: Date | null;
  dueDate?: Date | null;
  estimatedMinutes?: number | null;
  projectId?: string | null;
  sectionId?: string | null;
  clientId?: string | null;
};

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const [created] = await db
    .insert(schema.task)
    .values({
      organizationId: input.organizationId,
      createdById: input.createdById,
      title: input.title,
      descriptionMarkdown: input.descriptionMarkdown ?? null,
      priority: input.priority ?? "P4",
      scheduledAt: input.scheduledAt ?? null,
      dueDate: input.dueDate ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      projectId: input.projectId ?? null,
      sectionId: input.sectionId ?? null,
      clientId: input.clientId ?? null,
    })
    .returning();
  if (!created) throw new Error("Insert task failed");
  return created;
}

/**
 * Toggle complete/incomplete. Restituisce lo stato aggiornato.
 * Se completedAt era valorizzato → uncheck (null). Se era null → check (now).
 */
export async function toggleTaskComplete(opts: {
  taskId: string;
  organizationId: string;
}): Promise<Task> {
  const current = await db.query.task.findFirst({
    where: and(
      eq(schema.task.id, opts.taskId),
      eq(schema.task.organizationId, opts.organizationId),
      isNull(schema.task.deletedAt),
    ),
  });
  if (!current) throw new Error("Task non trovato o cancellato");

  const [updated] = await db
    .update(schema.task)
    .set({ completedAt: current.completedAt ? null : new Date() })
    .where(eq(schema.task.id, opts.taskId))
    .returning();
  if (!updated) throw new Error("Update task fallito");
  return updated;
}

/**
 * Soft delete: setta deletedAt. Nessun cascade — il task resta in DB per recovery.
 */
export async function softDeleteTask(opts: {
  taskId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .update(schema.task)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(schema.task.id, opts.taskId),
        eq(schema.task.organizationId, opts.organizationId),
      ),
    );
}
