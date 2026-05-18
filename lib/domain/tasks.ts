/**
 * Task domain — Drizzle query helpers.
 *
 * Server-side only. Tutti i metodi prendono `organizationId` esplicito — le
 * action layer in `lib/actions/tasks.ts` aggiungono il guard `requireActiveOrganization`.
 *
 * Timestamps: i campi `scheduledAt`/`completedAt`/etc. sono UTC nel DB; la
 * conversione tz avviene qui per i bound dei range (today/upcoming).
 */

import { and, asc, desc, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { addDays } from "date-fns";

import { db, schema } from "@/lib/db";
import type { Task } from "@/lib/db/schema";
import { computeNextOccurrence } from "@/lib/parsers/recurrence";
import { todayBoundsUtc } from "@/lib/utils/today-bounds";

export { todayBoundsUtc };

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
 * Conteggio task completati per cliente in un range [from, to).
 * Conta solo i task con task.clientId valorizzato (esclude tasks via project).
 */
export async function getCompletedTaskCountByClient(opts: {
  organizationId: string;
  from?: Date;
  to?: Date;
}): Promise<Map<string, number>> {
  const conds = [
    eq(schema.task.organizationId, opts.organizationId),
    isNotNull(schema.task.completedAt),
    isNotNull(schema.task.clientId),
    isNull(schema.task.deletedAt),
  ];
  if (opts.from) conds.push(gte(schema.task.completedAt, opts.from));
  if (opts.to) conds.push(lt(schema.task.completedAt, opts.to));

  const rows = await db
    .select({
      clientId: schema.task.clientId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.task)
    .where(and(...conds))
    .groupBy(schema.task.clientId);

  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.clientId) map.set(r.clientId, Number(r.count));
  }
  return map;
}

/**
 * Tasks linkati direttamente a un client (task.clientId = X).
 * Esclude i task collegati indirettamente via project — si vedono nella pagina project.
 * Open by default; passa `includeCompleted` per includere anche i completati.
 */
export async function getTasksForClient(
  ctx: ListContext & { clientId: string; includeCompleted?: boolean; limit?: number },
): Promise<Task[]> {
  const conds = [
    eq(schema.task.organizationId, ctx.organizationId),
    eq(schema.task.clientId, ctx.clientId),
    isNull(schema.task.deletedAt),
  ];
  if (!ctx.includeCompleted) conds.push(isNull(schema.task.completedAt));
  return db.query.task.findMany({
    where: and(...conds),
    orderBy: [asc(schema.task.completedAt), asc(schema.task.scheduledAt), desc(schema.task.createdAt)],
    limit: ctx.limit,
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
  recurrenceRule?: string | null;
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
      recurrenceRule: input.recurrenceRule ?? null,
    })
    .returning();
  if (!created) throw new Error("Insert task failed");
  return created;
}

/**
 * Toggle complete/incomplete. Restituisce lo stato aggiornato + eventuale next-occurrence
 * spawned se il task aveva una recurrenceRule e veniva *completato* (non riaperto).
 */
export async function toggleTaskComplete(opts: {
  taskId: string;
  organizationId: string;
}): Promise<{ task: Task; spawned: Task | null }> {
  const current = await db.query.task.findFirst({
    where: and(
      eq(schema.task.id, opts.taskId),
      eq(schema.task.organizationId, opts.organizationId),
      isNull(schema.task.deletedAt),
    ),
  });
  if (!current) throw new Error("Task non trovato o cancellato");

  const isCompleting = !current.completedAt;

  const [updated] = await db
    .update(schema.task)
    .set({ completedAt: isCompleting ? new Date() : null })
    .where(eq(schema.task.id, opts.taskId))
    .returning();
  if (!updated) throw new Error("Update task fallito");

  // Spawn next occurrence se: stiamo COMPLETANDO + recurrenceRule + scheduledAt
  let spawned: Task | null = null;
  if (isCompleting && current.recurrenceRule && current.scheduledAt) {
    const nextDate = computeNextOccurrence(current.recurrenceRule, current.scheduledAt);
    if (nextDate) {
      spawned = await createTask({
        organizationId: current.organizationId,
        createdById: current.createdById,
        title: current.title,
        descriptionMarkdown: current.descriptionMarkdown,
        priority: current.priority,
        scheduledAt: nextDate,
        dueDate: current.dueDate,
        estimatedMinutes: current.estimatedMinutes,
        projectId: current.projectId,
        sectionId: current.sectionId,
        clientId: current.clientId,
        recurrenceRule: current.recurrenceRule, // catena continua
      });
    }
  }

  return { task: updated, spawned };
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
