/**
 * TimeEntry domain — timer + manual entries.
 *
 * Vincoli enforced a livello DB (Fase 0 schema):
 *   - Partial unique index `time_entry_one_running_per_user` su user_id WHERE is_running=true
 *     → solo UN timer attivo per utente; tentativi di INSERT concorrenti → 23505.
 *
 * Snapshot tariffa: l'app risolve la tariffa al momento di INSERT/STOP e la congela
 * in hourly_rate_snapshot/currency_snapshot. Modifiche future al BillingRate NON
 * ricalcolano retroattivamente.
 */

import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Task, TimeEntry } from "@/lib/db/schema";
import {
  computeDurationSeconds,
  validateTimeEntryRange,
} from "@/lib/utils/compute-duration-seconds";
import { resolveRate } from "./billing";

// ---------------------------------------------------------------------------
// Audit log helpers
// ---------------------------------------------------------------------------

type AuditAction = "CREATE" | "UPDATE" | "STOP" | "RESUME" | "DELETE";

async function writeAudit(opts: {
  timeEntryId: string;
  actorId: string;
  action: AuditAction;
  before?: TimeEntry | null;
  after?: TimeEntry | null;
}) {
  // TODO: schema attualmente fa onDelete:cascade su timeEntryId → audit di DELETE
  // perderebbe la traccia. Migration futura: set onDelete:setNull + nullable.
  await db.insert(schema.timeEntryAudit).values({
    timeEntryId: opts.timeEntryId,
    actorId: opts.actorId,
    action: opts.action,
    beforeJson: opts.before ? serializeEntry(opts.before) : null,
    afterJson: opts.after ? serializeEntry(opts.after) : null,
  });
}

function serializeEntry(e: TimeEntry): Record<string, unknown> {
  // Date → ISO string per jsonb (JSON.stringify lo fa già, ma esplicitiamo)
  return {
    ...e,
    startedAt: e.startedAt.toISOString(),
    endedAt: e.endedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getRunningTimer(opts: {
  userId: string;
  organizationId: string;
}): Promise<TimeEntry | null> {
  const entry = await db.query.timeEntry.findFirst({
    where: and(
      eq(schema.timeEntry.userId, opts.userId),
      eq(schema.timeEntry.organizationId, opts.organizationId),
      eq(schema.timeEntry.isRunning, true),
    ),
  });
  return entry ?? null;
}

// ---------------------------------------------------------------------------
// Quick-entry grid (timesheet a tabella per cliente)
// ---------------------------------------------------------------------------

/**
 * Una "quick entry" è una time_entry ancorata a mezzanotte locale (00:00:00.000)
 * per uno specifico user×client×projectId. Un timer reale non produce mai un
 * startedAt esattamente a quel valore: usiamo questo come euristica per
 * separare le celle modificabili dalla griglia dalle voci di tracking.
 */
export type QuickGridEntry = {
  id: string;
  dayKey: string;
  projectId: string | null;
  durationSeconds: number;
};

export type QuickGridSummaryCell = {
  dayKey: string;
  projectId: string | null;
  totalSeconds: number;
};

export async function listQuickGridDataForClient(opts: {
  organizationId: string;
  userId: string;
  clientId: string;
  weekStart: Date;
  weekEnd: Date;
}): Promise<{ managed: QuickGridEntry[]; summary: QuickGridSummaryCell[] }> {
  const rows = await db.query.timeEntry.findMany({
    where: and(
      eq(schema.timeEntry.organizationId, opts.organizationId),
      eq(schema.timeEntry.userId, opts.userId),
      eq(schema.timeEntry.clientId, opts.clientId),
      gte(schema.timeEntry.startedAt, opts.weekStart),
      lt(schema.timeEntry.startedAt, opts.weekEnd),
    ),
    columns: {
      id: true,
      startedAt: true,
      projectId: true,
      durationSeconds: true,
      isRunning: true,
    },
  });

  const summaryMap = new Map<string, QuickGridSummaryCell>();
  const managed: QuickGridEntry[] = [];

  for (const r of rows) {
    if (r.isRunning) continue;
    const dur = r.durationSeconds ?? 0;
    const dayKey = formatDayKey(r.startedAt);
    const sumKey = `${dayKey}::${r.projectId ?? ""}`;
    const cell = summaryMap.get(sumKey) ?? {
      dayKey,
      projectId: r.projectId,
      totalSeconds: 0,
    };
    cell.totalSeconds += dur;
    summaryMap.set(sumKey, cell);
    if (isAnchorDate(r.startedAt)) {
      managed.push({
        id: r.id,
        dayKey,
        projectId: r.projectId,
        durationSeconds: dur,
      });
    }
  }

  return { managed, summary: [...summaryMap.values()] };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isAnchorDate(d: Date): boolean {
  return (
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0
  );
}

function anchorDateForDayKey(dayKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) throw new Error(`dayKey non valido: ${dayKey}`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export type UpsertQuickEntryInput = {
  organizationId: string;
  userId: string;
  clientId: string;
  projectId: string | null;
  dayKey: string;
  hours: number;
};

/**
 * Upsert/elimina la "managed" entry della griglia per (user, client, projectId, dayKey).
 * hours == 0 → elimina la entry se esiste.
 */
export async function upsertQuickEntry(
  input: UpsertQuickEntryInput,
): Promise<TimeEntry | null> {
  if (!Number.isFinite(input.hours) || input.hours < 0) {
    throw new Error("Ore non valide");
  }
  if (input.hours > 24) {
    throw new Error("Massimo 24 ore al giorno");
  }
  const anchor = anchorDateForDayKey(input.dayKey);
  const projectMatch = input.projectId
    ? eq(schema.timeEntry.projectId, input.projectId)
    : sql`${schema.timeEntry.projectId} IS NULL`;
  const existing = await db.query.timeEntry.findFirst({
    where: and(
      eq(schema.timeEntry.organizationId, input.organizationId),
      eq(schema.timeEntry.userId, input.userId),
      eq(schema.timeEntry.clientId, input.clientId),
      eq(schema.timeEntry.startedAt, anchor),
      projectMatch,
    ),
  });

  if (input.hours === 0) {
    if (!existing) return null;
    await writeAudit({
      timeEntryId: existing.id,
      actorId: input.userId,
      action: "DELETE",
      before: existing,
    });
    await db.delete(schema.timeEntry).where(eq(schema.timeEntry.id, existing.id));
    return null;
  }

  const durationSeconds = Math.round(input.hours * 3600);
  const endedAt = new Date(anchor.getTime() + durationSeconds * 1000);

  if (existing) {
    const [updated] = await db
      .update(schema.timeEntry)
      .set({ endedAt, durationSeconds, updatedAt: new Date() })
      .where(eq(schema.timeEntry.id, existing.id))
      .returning();
    if (!updated) throw new Error("Aggiornamento quick entry fallito");
    await writeAudit({
      timeEntryId: updated.id,
      actorId: input.userId,
      action: "UPDATE",
      before: existing,
      after: updated,
    });
    return updated;
  }

  const { rate, currency } = await resolveRateSnapshot({
    organizationId: input.organizationId,
    projectId: input.projectId,
    clientId: input.clientId,
    userId: input.userId,
  });
  const [created] = await db
    .insert(schema.timeEntry)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      clientId: input.clientId,
      projectId: input.projectId,
      startedAt: anchor,
      endedAt,
      durationSeconds,
      isRunning: false,
      isBillable: true,
      hourlyRateSnapshot: rate,
      currencySnapshot: currency,
    })
    .returning();
  if (!created) throw new Error("Insert quick entry fallito");
  await writeAudit({
    timeEntryId: created.id,
    actorId: input.userId,
    action: "CREATE",
    after: created,
  });
  return created;
}

export async function listTimeEntriesForClient(opts: {
  clientId: string;
  organizationId: string;
  from?: Date;
  to?: Date;
  limit?: number;
}): Promise<TimeEntry[]> {
  const conds = [
    eq(schema.timeEntry.organizationId, opts.organizationId),
    eq(schema.timeEntry.clientId, opts.clientId),
  ];
  if (opts.from) conds.push(gte(schema.timeEntry.startedAt, opts.from));
  if (opts.to) conds.push(lt(schema.timeEntry.startedAt, opts.to));

  return db.query.timeEntry.findMany({
    where: and(...conds),
    orderBy: [desc(schema.timeEntry.startedAt)],
    limit: opts.limit ?? 1000,
  });
}

export async function getTimeEntry(opts: {
  timeEntryId: string;
  organizationId: string;
}): Promise<TimeEntry | null> {
  const entry = await db.query.timeEntry.findFirst({
    where: and(
      eq(schema.timeEntry.id, opts.timeEntryId),
      eq(schema.timeEntry.organizationId, opts.organizationId),
    ),
  });
  return entry ?? null;
}

export async function listTimeEntriesForUser(opts: {
  userId: string;
  organizationId: string;
  from?: Date;
  to?: Date;
  clientId?: string | null;
  projectId?: string | null;
  limit?: number;
}): Promise<TimeEntry[]> {
  const conds = [
    eq(schema.timeEntry.organizationId, opts.organizationId),
    eq(schema.timeEntry.userId, opts.userId),
  ];
  if (opts.from) conds.push(gte(schema.timeEntry.startedAt, opts.from));
  if (opts.to) conds.push(lt(schema.timeEntry.startedAt, opts.to));
  if (opts.clientId) conds.push(eq(schema.timeEntry.clientId, opts.clientId));
  if (opts.projectId) conds.push(eq(schema.timeEntry.projectId, opts.projectId));

  return db.query.timeEntry.findMany({
    where: and(...conds),
    orderBy: [desc(schema.timeEntry.startedAt)],
    limit: opts.limit ?? 200,
  });
}

/**
 * Aggrega le ore tracciate per ogni taskId.
 * Include solo entries chiuse (durationSeconds non-null).
 * Ritorna una Map per O(1) lookup nelle viste.
 */
export async function getTrackedSecondsByTask(opts: {
  organizationId: string;
  taskIds: string[];
}): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (opts.taskIds.length === 0) return map;

  const rows = await db
    .select({
      taskId: schema.timeEntry.taskId,
      total: sql<number>`COALESCE(SUM(${schema.timeEntry.durationSeconds}), 0)::int`,
    })
    .from(schema.timeEntry)
    .where(
      and(
        eq(schema.timeEntry.organizationId, opts.organizationId),
        inArray(schema.timeEntry.taskId, opts.taskIds),
        eq(schema.timeEntry.isRunning, false),
      ),
    )
    .groupBy(schema.timeEntry.taskId);

  for (const r of rows) {
    if (r.taskId) map.set(r.taskId, Number(r.total));
  }
  return map;
}

/**
 * Aggregato per cliente (per i report): per ogni clientId nella org, ritorna
 * { totalSeconds, billableAmount } su un range di date opzionale.
 */
export async function getClientAggregates(opts: {
  organizationId: string;
  from?: Date;
  to?: Date;
}): Promise<
  Map<
    string,
    { totalSeconds: number; billableAmount: number; entryCount: number }
  >
> {
  const conds = [
    eq(schema.timeEntry.organizationId, opts.organizationId),
    eq(schema.timeEntry.isRunning, false),
  ];
  if (opts.from) conds.push(gte(schema.timeEntry.startedAt, opts.from));
  if (opts.to) conds.push(lt(schema.timeEntry.startedAt, opts.to));

  const rows = await db
    .select({
      clientId: schema.timeEntry.clientId,
      totalSeconds: sql<number>`COALESCE(SUM(${schema.timeEntry.durationSeconds}), 0)::int`,
      billableAmount: sql<string>`COALESCE(SUM(
        CASE WHEN ${schema.timeEntry.isBillable} = true AND ${schema.timeEntry.hourlyRateSnapshot} IS NOT NULL
          THEN ${schema.timeEntry.hourlyRateSnapshot} * (${schema.timeEntry.durationSeconds}::numeric / 3600)
          ELSE 0
        END
      ), 0)::numeric`,
      entryCount: sql<number>`COUNT(*)::int`,
    })
    .from(schema.timeEntry)
    .where(and(...conds))
    .groupBy(schema.timeEntry.clientId);

  const out = new Map<
    string,
    { totalSeconds: number; billableAmount: number; entryCount: number }
  >();
  for (const r of rows) {
    if (!r.clientId) continue;
    out.set(r.clientId, {
      totalSeconds: Number(r.totalSeconds),
      billableAmount: Number(r.billableAmount),
      entryCount: Number(r.entryCount),
    });
  }
  return out;
}

/**
 * Aggregato per progetto su un singolo cliente. Usato per il breakdown
 * nella pagina cliente / billing run.
 *
 * Include un bucket con projectId=null per le entries senza progetto:
 * in fatturazione vogliamo vedere TUTTE le ore del cliente.
 */
export async function getProjectAggregatesForClient(opts: {
  organizationId: string;
  clientId: string;
  from?: Date;
  to?: Date;
}): Promise<
  Array<{
    projectId: string | null;
    totalSeconds: number;
    billableAmount: number;
    entryCount: number;
  }>
> {
  const conds = [
    eq(schema.timeEntry.organizationId, opts.organizationId),
    eq(schema.timeEntry.clientId, opts.clientId),
    eq(schema.timeEntry.isRunning, false),
  ];
  if (opts.from) conds.push(gte(schema.timeEntry.startedAt, opts.from));
  if (opts.to) conds.push(lt(schema.timeEntry.startedAt, opts.to));

  const rows = await db
    .select({
      projectId: schema.timeEntry.projectId,
      totalSeconds: sql<number>`COALESCE(SUM(${schema.timeEntry.durationSeconds}), 0)::int`,
      billableAmount: sql<string>`COALESCE(SUM(
        CASE WHEN ${schema.timeEntry.isBillable} = true AND ${schema.timeEntry.hourlyRateSnapshot} IS NOT NULL
          THEN ${schema.timeEntry.hourlyRateSnapshot} * (${schema.timeEntry.durationSeconds}::numeric / 3600)
          ELSE 0
        END
      ), 0)::numeric`,
      entryCount: sql<number>`COUNT(*)::int`,
    })
    .from(schema.timeEntry)
    .where(and(...conds))
    .groupBy(schema.timeEntry.projectId);

  return rows.map((r) => ({
    projectId: r.projectId,
    totalSeconds: Number(r.totalSeconds),
    billableAmount: Number(r.billableAmount),
    entryCount: Number(r.entryCount),
  }));
}

// ---------------------------------------------------------------------------
// Rate snapshot (cascade gerarchico via lib/domain/billing.ts)
// ---------------------------------------------------------------------------

/**
 * Resolve rate snapshot al momento del tracking, con cascade completo:
 *   TASK → PROJECT → CLIENT (+ fallback hourlyRateDefault) → USER → null
 *
 * Restituisce rate=null se nessuna sorgente lo definisce; in tal caso
 * la voce di tracking non e' fatturabile a tariffa (può comunque essere
 * billable senza importo).
 */
export async function resolveRateSnapshot(opts: {
  organizationId: string;
  taskId?: string | null;
  projectId?: string | null;
  clientId?: string | null;
  userId?: string | null;
}): Promise<{ rate: string | null; currency: string | null }> {
  const resolved = await resolveRate(opts);
  return {
    rate: resolved.rate,
    currency: resolved.rate ? resolved.currency : null,
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type StartTimerInput = {
  organizationId: string;
  userId: string;
  description?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  isBillable?: boolean;
};

/**
 * Avvia un timer. Ritorna:
 *  - { ok: true, entry } se creato
 *  - { ok: false, reason: "already-running", existing } se gia' un timer attivo (vincolo DB)
 */
export async function startTimer(input: StartTimerInput): Promise<
  | { ok: true; entry: TimeEntry }
  | { ok: false; reason: "already-running"; existing: TimeEntry | null }
> {
  const { rate, currency } = await resolveRateSnapshot({
    organizationId: input.organizationId,
    taskId: input.taskId,
    projectId: input.projectId,
    clientId: input.clientId,
    userId: input.userId,
  });

  try {
    const [created] = await db
      .insert(schema.timeEntry)
      .values({
        organizationId: input.organizationId,
        userId: input.userId,
        description: input.description ?? null,
        clientId: input.clientId ?? null,
        projectId: input.projectId ?? null,
        taskId: input.taskId ?? null,
        startedAt: new Date(),
        isRunning: true,
        isBillable: input.isBillable ?? true,
        hourlyRateSnapshot: rate,
        currencySnapshot: currency,
      })
      .returning();
    if (!created) throw new Error("Insert time_entry fallito");
    await writeAudit({
      timeEntryId: created.id,
      actorId: input.userId,
      action: "CREATE",
      after: created,
    });
    return { ok: true, entry: created };
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      const existing = await getRunningTimer({
        userId: input.userId,
        organizationId: input.organizationId,
      });
      return { ok: false, reason: "already-running", existing };
    }
    throw err;
  }
}

export async function stopTimer(opts: {
  userId: string;
  organizationId: string;
}): Promise<TimeEntry | null> {
  const running = await getRunningTimer(opts);
  if (!running) return null;
  const now = new Date();
  const duration = computeDurationSeconds(running.startedAt, now);
  const [updated] = await db
    .update(schema.timeEntry)
    .set({
      endedAt: now,
      isRunning: false,
      durationSeconds: duration,
    })
    .where(eq(schema.timeEntry.id, running.id))
    .returning();
  if (updated) {
    await writeAudit({
      timeEntryId: updated.id,
      actorId: opts.userId,
      action: "STOP",
      before: running,
      after: updated,
    });
  }
  return updated ?? null;
}

export type CreateManualEntryInput = {
  organizationId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date;
  description?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  isBillable?: boolean;
};

export async function createManualEntry(input: CreateManualEntryInput): Promise<TimeEntry> {
  validateTimeEntryRange(input.startedAt, input.endedAt);
  const duration = computeDurationSeconds(input.startedAt, input.endedAt);
  const { rate, currency } = await resolveRateSnapshot({
    organizationId: input.organizationId,
    taskId: input.taskId,
    projectId: input.projectId,
    clientId: input.clientId,
    userId: input.userId,
  });

  const [created] = await db
    .insert(schema.timeEntry)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      description: input.description ?? null,
      clientId: input.clientId ?? null,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSeconds: duration,
      isRunning: false,
      isBillable: input.isBillable ?? true,
      hourlyRateSnapshot: rate,
      currencySnapshot: currency,
    })
    .returning();
  if (!created) throw new Error("Insert manual entry fallito");
  await writeAudit({
    timeEntryId: created.id,
    actorId: input.userId,
    action: "CREATE",
    after: created,
  });
  return created;
}

/**
 * Avvia un timer ereditando i campi da un Task: clientId, projectId, title come description.
 */
export async function startTimerFromTask(opts: {
  organizationId: string;
  userId: string;
  task: Task;
}): Promise<
  | { ok: true; entry: TimeEntry }
  | { ok: false; reason: "already-running"; existing: TimeEntry | null }
> {
  return startTimer({
    organizationId: opts.organizationId,
    userId: opts.userId,
    description: opts.task.title,
    clientId: opts.task.clientId,
    projectId: opts.task.projectId,
    taskId: opts.task.id,
  });
}

export type UpdateTimeEntryInput = {
  timeEntryId: string;
  organizationId: string;
  actorId: string;
  description?: string | null;
  startedAt: Date;
  endedAt: Date;
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  isBillable?: boolean;
};

export async function updateTimeEntry(input: UpdateTimeEntryInput): Promise<TimeEntry> {
  const existing = await getTimeEntry({
    timeEntryId: input.timeEntryId,
    organizationId: input.organizationId,
  });
  if (!existing) throw new Error("Voce non trovata");
  if (existing.userId !== input.actorId) {
    throw new Error("Non puoi modificare voci di altri utenti");
  }
  if (existing.isRunning) {
    throw new Error("Ferma il timer prima di modificare la voce");
  }
  validateTimeEntryRange(input.startedAt, input.endedAt);
  const durationSeconds = computeDurationSeconds(input.startedAt, input.endedAt);

  const [updated] = await db
    .update(schema.timeEntry)
    .set({
      description: input.description ?? null,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSeconds,
      clientId: input.clientId ?? null,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      isBillable: input.isBillable ?? existing.isBillable,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.timeEntry.id, input.timeEntryId),
        eq(schema.timeEntry.organizationId, input.organizationId),
      ),
    )
    .returning();
  if (!updated) throw new Error("Aggiornamento voce fallito");
  await writeAudit({
    timeEntryId: updated.id,
    actorId: input.actorId,
    action: "UPDATE",
    before: existing,
    after: updated,
  });
  return updated;
}

export async function deleteTimeEntry(opts: {
  timeEntryId: string;
  organizationId: string;
  actorId: string;
}): Promise<void> {
  const existing = await getTimeEntry({
    timeEntryId: opts.timeEntryId,
    organizationId: opts.organizationId,
  });
  if (!existing) throw new Error("Voce non trovata");
  if (existing.userId !== opts.actorId) {
    throw new Error("Non puoi eliminare voci di altri utenti");
  }
  if (existing.isRunning) {
    throw new Error("Ferma il timer prima di eliminare la voce");
  }
  await writeAudit({
    timeEntryId: existing.id,
    actorId: opts.actorId,
    action: "DELETE",
    before: existing,
  });
  await db
    .delete(schema.timeEntry)
    .where(
      and(
        eq(schema.timeEntry.id, opts.timeEntryId),
        eq(schema.timeEntry.organizationId, opts.organizationId),
      ),
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPgUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "23505") return true;
  if (typeof e.message === "string" && /duplicate key|unique/i.test(e.message)) return true;
  return false;
}
