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

import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { TimeEntry } from "@/lib/db/schema";
import { getClient } from "./clients";

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

export async function listTimeEntriesForClient(opts: {
  clientId: string;
  organizationId: string;
  limit?: number;
}): Promise<TimeEntry[]> {
  return db.query.timeEntry.findMany({
    where: and(
      eq(schema.timeEntry.organizationId, opts.organizationId),
      eq(schema.timeEntry.clientId, opts.clientId),
    ),
    orderBy: [desc(schema.timeEntry.startedAt)],
    limit: opts.limit ?? 100,
  });
}

export async function listTimeEntriesForUser(opts: {
  userId: string;
  organizationId: string;
  limit?: number;
}): Promise<TimeEntry[]> {
  return db.query.timeEntry.findMany({
    where: and(
      eq(schema.timeEntry.organizationId, opts.organizationId),
      eq(schema.timeEntry.userId, opts.userId),
    ),
    orderBy: [desc(schema.timeEntry.startedAt)],
    limit: opts.limit ?? 100,
  });
}

// ---------------------------------------------------------------------------
// Rate resolver (MVP — cascade completo in iter 2.4)
// ---------------------------------------------------------------------------

/**
 * Resolve rate snapshot al momento del tracking.
 *
 * MVP (Fase 2.2): cliente.hourlyRateDefault → null
 * Cascade completo (task → project → client → user → workspace) in Fase 2.4
 * via lib/domain/billing.ts (TODO).
 */
export async function resolveRateSnapshot(opts: {
  organizationId: string;
  clientId?: string | null;
}): Promise<{ rate: string | null; currency: string | null }> {
  if (opts.clientId) {
    const client = await getClient({
      clientId: opts.clientId,
      organizationId: opts.organizationId,
    });
    if (client?.hourlyRateDefault) {
      return { rate: client.hourlyRateDefault, currency: client.currency };
    }
  }
  return { rate: null, currency: null };
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
    clientId: input.clientId,
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
  const duration = Math.max(0, Math.floor((now.getTime() - running.startedAt.getTime()) / 1000));
  const [updated] = await db
    .update(schema.timeEntry)
    .set({
      endedAt: now,
      isRunning: false,
      durationSeconds: duration,
    })
    .where(eq(schema.timeEntry.id, running.id))
    .returning();
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
  if (input.endedAt.getTime() <= input.startedAt.getTime()) {
    throw new Error("endedAt deve essere > startedAt");
  }
  const duration = Math.floor((input.endedAt.getTime() - input.startedAt.getTime()) / 1000);
  const { rate, currency } = await resolveRateSnapshot({
    organizationId: input.organizationId,
    clientId: input.clientId,
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
  return created;
}

export async function deleteTimeEntry(opts: {
  timeEntryId: string;
  organizationId: string;
}): Promise<void> {
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
