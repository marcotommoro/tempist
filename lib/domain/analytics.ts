/**
 * Analytics domain — aggregate avanzate per i report.
 *
 * Tutte le funzioni accettano range opzionali [from, to). Niente cache lato app:
 * Postgres GROUP BY su tabelle indicizzate gira sotto i 10ms anche con 10k entries.
 */

import { and, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

type Range = { from?: Date; to?: Date };

// ---------------------------------------------------------------------------
// Time entries aggregates
// ---------------------------------------------------------------------------

/**
 * Ore tracciate per giorno (UTC truncate). Ritorna array ordinato cronologicamente
 * con buchi assenti — il client può fillare se serve continuità.
 */
export async function getHoursByDay(opts: {
  organizationId: string;
} & Range): Promise<{ day: string; totalSeconds: number }[]> {
  const conds = [
    eq(schema.timeEntry.organizationId, opts.organizationId),
    eq(schema.timeEntry.isRunning, false),
  ];
  if (opts.from) conds.push(gte(schema.timeEntry.startedAt, opts.from));
  if (opts.to) conds.push(lt(schema.timeEntry.startedAt, opts.to));

  const rows = await db
    .select({
      day: sql<string>`TO_CHAR(${schema.timeEntry.startedAt}, 'YYYY-MM-DD')`,
      totalSeconds: sql<number>`COALESCE(SUM(${schema.timeEntry.durationSeconds}), 0)::int`,
    })
    .from(schema.timeEntry)
    .where(and(...conds))
    .groupBy(sql`TO_CHAR(${schema.timeEntry.startedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`1 ASC`);

  return rows.map((r) => ({ day: r.day, totalSeconds: Number(r.totalSeconds) }));
}

/**
 * Aggregate per projectId: totale secondi + entry count + billable amount.
 */
export async function getProjectBreakdown(opts: {
  organizationId: string;
} & Range): Promise<
  Map<
    string,
    { totalSeconds: number; entryCount: number; billableAmount: number }
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
      projectId: schema.timeEntry.projectId,
      totalSeconds: sql<number>`COALESCE(SUM(${schema.timeEntry.durationSeconds}), 0)::int`,
      entryCount: sql<number>`COUNT(*)::int`,
      billableAmount: sql<string>`COALESCE(SUM(
        CASE WHEN ${schema.timeEntry.isBillable} = true AND ${schema.timeEntry.hourlyRateSnapshot} IS NOT NULL
          THEN ${schema.timeEntry.hourlyRateSnapshot} * (${schema.timeEntry.durationSeconds}::numeric / 3600)
          ELSE 0
        END
      ), 0)::numeric`,
    })
    .from(schema.timeEntry)
    .where(and(...conds))
    .groupBy(schema.timeEntry.projectId);

  const out = new Map<
    string,
    { totalSeconds: number; entryCount: number; billableAmount: number }
  >();
  for (const r of rows) {
    if (!r.projectId) continue;
    out.set(r.projectId, {
      totalSeconds: Number(r.totalSeconds),
      entryCount: Number(r.entryCount),
      billableAmount: Number(r.billableAmount),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Task aggregates
// ---------------------------------------------------------------------------

/**
 * Task completati per giorno (basato su completedAt). Range mandatorio.
 */
export async function getCompletedTasksByDay(opts: {
  organizationId: string;
} & Range): Promise<{ day: string; count: number }[]> {
  const conds = [
    eq(schema.task.organizationId, opts.organizationId),
    isNotNull(schema.task.completedAt),
    isNull(schema.task.deletedAt),
  ];
  if (opts.from) conds.push(gte(schema.task.completedAt, opts.from));
  if (opts.to) conds.push(lt(schema.task.completedAt, opts.to));

  const rows = await db
    .select({
      day: sql<string>`TO_CHAR(${schema.task.completedAt}, 'YYYY-MM-DD')`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.task)
    .where(and(...conds))
    .groupBy(sql`TO_CHAR(${schema.task.completedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`1 ASC`);

  return rows.map((r) => ({ day: r.day, count: Number(r.count) }));
}

/**
 * Conteggio task per priorità (P1..P4): open + completati distinti.
 */
export async function getTasksByPriority(opts: {
  organizationId: string;
}): Promise<
  Record<"P1" | "P2" | "P3" | "P4", { open: number; completed: number }>
> {
  const rows = await db
    .select({
      priority: schema.task.priority,
      open: sql<number>`COUNT(*) FILTER (WHERE ${schema.task.completedAt} IS NULL)::int`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${schema.task.completedAt} IS NOT NULL)::int`,
    })
    .from(schema.task)
    .where(
      and(
        eq(schema.task.organizationId, opts.organizationId),
        isNull(schema.task.deletedAt),
      ),
    )
    .groupBy(schema.task.priority);

  const out: Record<"P1" | "P2" | "P3" | "P4", { open: number; completed: number }> = {
    P1: { open: 0, completed: 0 },
    P2: { open: 0, completed: 0 },
    P3: { open: 0, completed: 0 },
    P4: { open: 0, completed: 0 },
  };
  for (const r of rows) {
    out[r.priority] = { open: Number(r.open), completed: Number(r.completed) };
  }
  return out;
}

/**
 * Aggregate per labelId: numero di task aperti che portano quella label.
 */
export async function getOpenTasksByLabel(opts: {
  organizationId: string;
}): Promise<Map<string, number>> {
  const rows = await db
    .select({
      labelId: schema.taskLabel.labelId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.taskLabel)
    .innerJoin(schema.task, eq(schema.task.id, schema.taskLabel.taskId))
    .where(
      and(
        eq(schema.task.organizationId, opts.organizationId),
        isNull(schema.task.completedAt),
        isNull(schema.task.deletedAt),
      ),
    )
    .groupBy(schema.taskLabel.labelId);

  const out = new Map<string, number>();
  for (const r of rows) out.set(r.labelId, Number(r.count));
  return out;
}
