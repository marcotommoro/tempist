/**
 * Task domain — Drizzle query helpers.
 *
 * Server-side only. Tutti i metodi prendono `organizationId` esplicito — le
 * action layer in `lib/actions/tasks.ts` aggiungono il guard `requireActiveOrganization`.
 *
 * Timestamps: i campi `scheduledAt`/`completedAt`/etc. sono UTC nel DB; la
 * conversione tz avviene qui per i bound dei range (today/upcoming).
 */

import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
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
 * Today: task con scheduledAt nel range "fino a fine giornata utente".
 * Include overdue non completati e completati nella giornata (rimangono visibili,
 * barrati nella UI). Esclude i completati ieri o prima per non gonfiare la lista.
 */
export async function getTodayTasks(
  ctx: ListContext & { timezone: string },
): Promise<Task[]> {
  const { startUtc, endUtc } = todayBoundsUtc(ctx.timezone);
  return db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, ctx.organizationId),
      isNull(schema.task.deletedAt),
      isNotNull(schema.task.scheduledAt),
      lt(schema.task.scheduledAt, endUtc),
      // include non-completed tasks (any scheduledAt < endUtc), OR completed tasks
      // whose scheduledAt is today (in [startUtc, endUtc)). We express this as:
      //   completedAt IS NULL OR scheduledAt >= startUtc
      sql`(${schema.task.completedAt} IS NULL OR ${schema.task.scheduledAt} >= ${startUtc})`,
    ),
    orderBy: [asc(schema.task.scheduledAt), asc(schema.task.order)],
  });
}

/**
 * Inbox: task senza project, non cancellati. Include i completati che restano
 * visibili (barrati) per coerenza con Today/Upcoming. Esclude le sottoattività
 * (senza progetto per costruzione): vivono nel dialog del padre.
 */
export async function getInboxTasks(ctx: ListContext): Promise<Task[]> {
  return db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, ctx.organizationId),
      isNull(schema.task.projectId),
      isNull(schema.task.parentId),
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
 * Task overdue: scheduledAt < startUtc oggi, non completati.
 * Ordinati per scheduledAt asc (i più vecchi prima).
 */
export async function getOverdueTasks(
  ctx: ListContext & { timezone: string },
): Promise<Task[]> {
  const { startUtc } = todayBoundsUtc(ctx.timezone);
  return db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, ctx.organizationId),
      isNull(schema.task.completedAt),
      isNull(schema.task.deletedAt),
      isNotNull(schema.task.scheduledAt),
      lt(schema.task.scheduledAt, startUtc),
    ),
    orderBy: [asc(schema.task.scheduledAt)],
  });
}

/**
 * Task in un range [from, to). Ritorna l'array piatto; raggruppamento per
 * giorno si fa in app per usare la tz utente.
 */
export async function getTasksInRange(
  ctx: ListContext & { from: Date; to: Date; includeCompleted?: boolean },
): Promise<Task[]> {
  const includeCompleted = ctx.includeCompleted ?? true;
  const conds = [
    eq(schema.task.organizationId, ctx.organizationId),
    isNull(schema.task.deletedAt),
    isNotNull(schema.task.scheduledAt),
    gte(schema.task.scheduledAt, ctx.from),
    lt(schema.task.scheduledAt, ctx.to),
  ];
  if (!includeCompleted) conds.push(isNull(schema.task.completedAt));
  return db.query.task.findMany({
    where: and(...conds),
    orderBy: [asc(schema.task.scheduledAt), asc(schema.task.order)],
  });
}

/**
 * Upcoming: task con scheduledAt > fine di oggi, entro `horizonDays` giorni.
 * Include i completati (restano visibili barrati nella UI per il giorno corrispondente).
 */
export async function getUpcomingTasks(
  ctx: ListContext & { timezone: string; horizonDays?: number },
): Promise<Task[]> {
  const { endUtc } = todayBoundsUtc(ctx.timezone);
  const horizonUtc = addDays(endUtc, ctx.horizonDays ?? 30);
  return db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, ctx.organizationId),
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
  /**
   * Durata dell'evento di calendario collegato, non una stima di lavoro:
   * la scrive solo il pull da Google, la rileggono push calendario e feed iCal.
   * Nell'app non è più visibile né modificabile (si tiene solo il tempo segnato).
   */
  estimatedMinutes?: number | null;
  projectId?: string | null;
  sectionId?: string | null;
  clientId?: string | null;
  recurrenceRule?: string | null;
  parentId?: string | null;
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
      parentId: input.parentId ?? null,
    })
    .returning();
  if (!created) throw new Error("Insert task failed");
  return created;
}

// ----------------------------------------------------------------------------
// Subtasks
// ----------------------------------------------------------------------------

/**
 * Crea una sottoattività (1 solo livello: un figlio non può avere figli).
 * Non eredita nulla dal padre — niente progetto/cliente/data/priorità: la
 * sottoattività vive nel dialog del padre e non compare in board né viste data.
 */
export async function createSubtask(opts: {
  organizationId: string;
  createdById: string;
  parentId: string;
  title: string;
}): Promise<Task> {
  const parent = await db.query.task.findFirst({
    where: and(
      eq(schema.task.id, opts.parentId),
      eq(schema.task.organizationId, opts.organizationId),
      isNull(schema.task.deletedAt),
    ),
    columns: { id: true, parentId: true },
  });
  if (!parent) throw new Error("Attività padre non trovata");
  if (parent.parentId) {
    throw new Error("Le sottoattività non possono avere altre sottoattività");
  }
  return createTask({
    organizationId: opts.organizationId,
    createdById: opts.createdById,
    title: opts.title,
    parentId: opts.parentId,
  });
}

/** Sottoattività vive di un task, in ordine di creazione. */
export async function listSubtasks(opts: {
  parentId: string;
  organizationId: string;
}): Promise<Task[]> {
  return db.query.task.findMany({
    where: and(
      eq(schema.task.parentId, opts.parentId),
      eq(schema.task.organizationId, opts.organizationId),
      isNull(schema.task.deletedAt),
    ),
    orderBy: [asc(schema.task.createdAt), asc(schema.task.id)],
  });
}

export type SubtaskCounts = { total: number; completed: number };

/**
 * Conteggi {total, completed} delle sottoattività vive per ciascun padre in
 * una sola query (GROUP BY su task_parent_idx) — niente N+1 nelle liste.
 * I padri senza figli non compaiono nella mappa.
 */
export async function getSubtaskCountsByParent(opts: {
  organizationId: string;
  taskIds: string[];
}): Promise<Map<string, SubtaskCounts>> {
  const map = new Map<string, SubtaskCounts>();
  if (opts.taskIds.length === 0) return map;

  const rows = await db
    .select({
      parentId: schema.task.parentId,
      total: sql<number>`COUNT(*)::int`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${schema.task.completedAt} IS NOT NULL)::int`,
    })
    .from(schema.task)
    .where(
      and(
        eq(schema.task.organizationId, opts.organizationId),
        inArray(schema.task.parentId, opts.taskIds),
        isNull(schema.task.deletedAt),
      ),
    )
    .groupBy(schema.task.parentId);

  for (const r of rows) {
    if (r.parentId) {
      map.set(r.parentId, {
        total: Number(r.total),
        completed: Number(r.completed),
      });
    }
  }
  return map;
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
  const now = new Date();

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.task)
      .set({ completedAt: isCompleting ? now : null })
      .where(eq(schema.task.id, opts.taskId))
      .returning();
    if (!row) throw new Error("Update task fallito");

    // Completare il padre completa anche le sottoattività aperte (stesso
    // timestamp). Riaprire NON le riapre. No-op sui figli (depth 1).
    if (isCompleting) {
      await tx
        .update(schema.task)
        .set({ completedAt: now })
        .where(
          and(
            eq(schema.task.parentId, opts.taskId),
            eq(schema.task.organizationId, opts.organizationId),
            isNull(schema.task.completedAt),
            isNull(schema.task.deletedAt),
          ),
        );
    }
    return row;
  });

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
 * Aggiorna scheduledAt + dueDate di un task. null per rimuovere.
 */
export async function updateTaskSchedule(opts: {
  taskId: string;
  organizationId: string;
  scheduledAt?: Date | null;
  dueDate?: Date | null;
}): Promise<void> {
  const patch: Partial<{ scheduledAt: Date | null; dueDate: Date | null }> = {};
  if ("scheduledAt" in opts) patch.scheduledAt = opts.scheduledAt ?? null;
  if ("dueDate" in opts) patch.dueDate = opts.dueDate ?? null;
  if (Object.keys(patch).length === 0) return;
  await db
    .update(schema.task)
    .set(patch)
    .where(
      and(
        eq(schema.task.id, opts.taskId),
        eq(schema.task.organizationId, opts.organizationId),
      ),
    );
}

/**
 * Sposta tutti i task overdue (scheduledAt < startUtc oggi) a oggi (a startUtc).
 * Ritorna il numero di task aggiornati. Usato dalla feature "Ripianifica" su /upcoming.
 */
export async function rescheduleOverdueToToday(opts: {
  organizationId: string;
  timezone: string;
}): Promise<number> {
  const { startUtc } = todayBoundsUtc(opts.timezone);
  const updated = await db
    .update(schema.task)
    .set({ scheduledAt: startUtc })
    .where(
      and(
        eq(schema.task.organizationId, opts.organizationId),
        isNull(schema.task.completedAt),
        isNull(schema.task.deletedAt),
        isNotNull(schema.task.scheduledAt),
        lt(schema.task.scheduledAt, startUtc),
      ),
    )
    .returning({ id: schema.task.id });
  return updated.length;
}

/**
 * Soft delete: setta deletedAt sul task e, in cascata, sulle sue sottoattività
 * vive. I record restano in DB per recovery.
 */
export async function softDeleteTask(opts: {
  taskId: string;
  organizationId: string;
}): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.task)
      .set({ deletedAt: now })
      .where(
        and(
          eq(schema.task.id, opts.taskId),
          eq(schema.task.organizationId, opts.organizationId),
        ),
      );
    await tx
      .update(schema.task)
      .set({ deletedAt: now })
      .where(
        and(
          eq(schema.task.parentId, opts.taskId),
          eq(schema.task.organizationId, opts.organizationId),
          isNull(schema.task.deletedAt),
        ),
      );
  });
}

export async function updateTaskDescription(opts: {
  taskId: string;
  organizationId: string;
  descriptionMarkdown: string | null;
}): Promise<void> {
  await db
    .update(schema.task)
    .set({ descriptionMarkdown: opts.descriptionMarkdown })
    .where(
      and(
        eq(schema.task.id, opts.taskId),
        eq(schema.task.organizationId, opts.organizationId),
      ),
    );
}

export async function updateTaskPriority(opts: {
  taskId: string;
  organizationId: string;
  priority: "P1" | "P2" | "P3" | "P4";
}): Promise<void> {
  await db
    .update(schema.task)
    .set({ priority: opts.priority })
    .where(
      and(
        eq(schema.task.id, opts.taskId),
        eq(schema.task.organizationId, opts.organizationId),
      ),
    );
}

export async function updateTaskTitle(opts: {
  taskId: string;
  organizationId: string;
  title: string;
}): Promise<void> {
  const trimmed = opts.title.trim();
  if (!trimmed) throw new Error("Titolo vuoto");
  await db
    .update(schema.task)
    .set({ title: trimmed })
    .where(
      and(
        eq(schema.task.id, opts.taskId),
        eq(schema.task.organizationId, opts.organizationId),
      ),
    );
}

/**
 * Sposta il task in un altro progetto (null = Inbox).
 * Cambiare progetto azzera la section: le section appartengono a un progetto,
 * quindi la section corrente non sarebbe più coerente col nuovo progetto.
 * Valida che il progetto target sia dell'org (no cross-tenant via FK).
 */
export async function updateTaskProject(opts: {
  taskId: string;
  organizationId: string;
  projectId: string | null;
}): Promise<void> {
  if (opts.projectId) {
    const proj = await db.query.project.findFirst({
      where: and(
        eq(schema.project.id, opts.projectId),
        eq(schema.project.organizationId, opts.organizationId),
        isNull(schema.project.deletedAt),
      ),
      columns: { id: true },
    });
    if (!proj) throw new Error("Progetto non trovato");
  }
  await db
    .update(schema.task)
    .set({ projectId: opts.projectId, sectionId: null })
    .where(
      and(
        eq(schema.task.id, opts.taskId),
        eq(schema.task.organizationId, opts.organizationId),
      ),
    );
}

/**
 * Associa il task a un cliente (null = nessuno). Relazione diretta su
 * task.clientId, indipendente dal progetto. Valida che il cliente sia dell'org.
 */
export async function updateTaskClient(opts: {
  taskId: string;
  organizationId: string;
  clientId: string | null;
}): Promise<void> {
  if (opts.clientId) {
    const cli = await db.query.client.findFirst({
      where: and(
        eq(schema.client.id, opts.clientId),
        eq(schema.client.organizationId, opts.organizationId),
        isNull(schema.client.deletedAt),
      ),
      columns: { id: true },
    });
    if (!cli) throw new Error("Cliente non trovato");
  }
  await db
    .update(schema.task)
    .set({ clientId: opts.clientId })
    .where(
      and(
        eq(schema.task.id, opts.taskId),
        eq(schema.task.organizationId, opts.organizationId),
      ),
    );
}
