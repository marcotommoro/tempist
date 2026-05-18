/**
 * Reminder domain — CRUD reminder + scan logic per il job.
 *
 * Scan flow:
 *   1. findDueReminders(now): SELECT reminder WHERE sent_at IS NULL e trigger time <= now
 *   2. Per ognuno: createNotification(userId, type=reminder.fired) + atomic UPDATE sent_at
 *      (UPDATE WHERE sent_at IS NULL → garantisce idempotenza in caso di concorrenza)
 *
 * Il filtro "trigger time <= now" è fatto in app, non in SQL — per RELATIVE i triggerValue
 * dipendono da task.scheduledAt. Per scalare oltre 10k reminder pendenti, valuteremo
 * un trigger time pre-computato in colonna.
 */

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Reminder, Task } from "@/lib/db/schema";
import { computeTriggerTime } from "@/lib/utils/reminder-time";
import { createNotification } from "./notifications";

export type CreateReminderInput = {
  taskId: string;
  triggerType: "TIME" | "RELATIVE";
  triggerValue: string;
  channels?: ("PUSH" | "EMAIL")[];
};

export async function createReminder(
  input: CreateReminderInput,
): Promise<Reminder> {
  const [created] = await db
    .insert(schema.reminder)
    .values({
      taskId: input.taskId,
      triggerType: input.triggerType,
      triggerValue: input.triggerValue,
      channels: input.channels ?? ["PUSH"],
    })
    .returning();
  if (!created) throw new Error("Insert reminder fallito");
  return created;
}

export async function listRemindersForTask(taskId: string): Promise<Reminder[]> {
  return db.query.reminder.findMany({
    where: eq(schema.reminder.taskId, taskId),
    orderBy: [asc(schema.reminder.createdAt)],
  });
}

export async function deleteReminder(reminderId: string): Promise<void> {
  await db.delete(schema.reminder).where(eq(schema.reminder.id, reminderId));
}

/**
 * Conta reminder pending (sentAt IS NULL) per taskId. Map per O(1) lookup nelle viste.
 */
export async function getPendingReminderCountByTask(
  taskIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (taskIds.length === 0) return map;
  const rows = await db
    .select({
      taskId: schema.reminder.taskId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.reminder)
    .where(
      and(
        inArray(schema.reminder.taskId, taskIds),
        isNull(schema.reminder.sentAt),
      ),
    )
    .groupBy(schema.reminder.taskId);
  for (const r of rows) map.set(r.taskId, Number(r.count));
  return map;
}

/**
 * Restituisce i reminder pending (sentAt=NULL) il cui trigger time è <= now,
 * con il task associato (per organizationId + createdById = chi riceve la notifica).
 */
export async function findDueReminders(now: Date = new Date()): Promise<
  { reminder: Reminder; task: Task }[]
> {
  const rows = await db
    .select({
      reminder: schema.reminder,
      task: schema.task,
    })
    .from(schema.reminder)
    .innerJoin(schema.task, eq(schema.reminder.taskId, schema.task.id))
    .where(and(isNull(schema.reminder.sentAt), isNull(schema.task.deletedAt)));

  return rows.filter((r) => {
    const t = computeTriggerTime({
      triggerType: r.reminder.triggerType,
      triggerValue: r.reminder.triggerValue,
      taskScheduledAt: r.task.scheduledAt,
    });
    return t !== null && t.getTime() <= now.getTime();
  });
}

/**
 * "Fires" un reminder: crea Notification e segna sent_at via UPDATE atomico
 * (la WHERE sent_at IS NULL fa da claim — ritorna 0 righe se già processed).
 */
export async function fireReminder(opts: {
  reminder: Reminder;
  task: Task;
}): Promise<{ fired: boolean; notificationId?: string }> {
  const now = new Date();
  const claimed = await db
    .update(schema.reminder)
    .set({ sentAt: now })
    .where(
      and(
        eq(schema.reminder.id, opts.reminder.id),
        isNull(schema.reminder.sentAt),
      ),
    )
    .returning({ id: schema.reminder.id });

  if (claimed.length === 0) return { fired: false };

  const notif = await createNotification({
    organizationId: opts.task.organizationId,
    userId: opts.task.createdById, // recipient = creatore (multi-assignee in fase futura)
    type: "reminder.fired",
    title: `Promemoria: ${opts.task.title}`,
    body: opts.task.scheduledAt
      ? `Pianificato per ${opts.task.scheduledAt.toISOString()}`
      : null,
    link: `/today`,
  });
  return { fired: true, notificationId: notif.id };
}

/**
 * Helper end-to-end usato dal job: scan + fire per ogni dovuto.
 * Ritorna il numero di reminder triggered con successo.
 */
export async function processDueReminders(now: Date = new Date()): Promise<number> {
  const due = await findDueReminders(now);
  let count = 0;
  for (const item of due) {
    const res = await fireReminder(item);
    if (res.fired) count++;
  }
  return count;
}
