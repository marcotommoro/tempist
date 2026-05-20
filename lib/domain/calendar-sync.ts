import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { CalendarAccount, Task } from "@/lib/db/schema";
import {
  getValidAccessToken,
  listAccountsDueForSync,
} from "@/lib/domain/calendar-accounts";
import { googleUpdatedForEvent, resolveSyncWinner } from "@/lib/domain/calendar-conflict";
import { ensureWatchChannel, pullAccount } from "@/lib/domain/calendar-pull";
import {
  deleteEvent,
  insertEvent,
  patchEvent,
} from "@/lib/integrations/google-calendar";

export type SyncStats = {
  pulled: { imported: number; updated: number; deleted: number };
  pushed: { inserted: number; updated: number; deleted: number };
};

export async function syncAccount(account: CalendarAccount): Promise<SyncStats> {
  const pulled = await pullAccount(account);
  await ensureWatchChannel(account);

  const fresh = await db.query.calendarAccount.findFirst({
    where: eq(schema.calendarAccount.id, account.id),
  });
  if (!fresh) {
    return { pulled, pushed: { inserted: 0, updated: 0, deleted: 0 } };
  }

  const pushed = await pushAccount(fresh);
  await markSynced(fresh.id);
  return { pulled, pushed };
}

async function pushAccount(account: CalendarAccount): Promise<{
  inserted: number;
  updated: number;
  deleted: number;
}> {
  const stats = { inserted: 0, updated: 0, deleted: 0 };
  const accessToken = await getValidAccessToken(account);

  const linkedTasks = await db
    .select({ task: schema.task, link: schema.calendarEventLink })
    .from(schema.calendarEventLink)
    .innerJoin(schema.task, eq(schema.calendarEventLink.taskId, schema.task.id))
    .where(eq(schema.calendarEventLink.calendarAccountId, account.id));

  for (const row of linkedTasks) {
    await pushLinkedOne({
      account,
      accessToken,
      task: row.task,
      link: row.link,
      stats,
    });
  }

  const since = account.updatedAt ?? new Date(0);
  const unlinked = await db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, account.organizationId),
      gt(schema.task.updatedAt, since),
      isNotNull(schema.task.scheduledAt),
      isNull(schema.task.deletedAt),
    ),
  });

  const linkedIds = new Set(linkedTasks.map((r) => r.task.id));
  for (const task of unlinked) {
    if (linkedIds.has(task.id)) continue;
    await pushUnlinkedOne({ account, accessToken, task, stats });
  }

  return stats;
}

async function pushLinkedOne(args: {
  account: CalendarAccount;
  accessToken: string;
  task: Task;
  link: typeof schema.calendarEventLink.$inferSelect;
  stats: { inserted: number; updated: number; deleted: number };
}): Promise<void> {
  const { accessToken, task, link, stats } = args;
  const shouldExist = !task.deletedAt && task.scheduledAt != null;

  if (!shouldExist) {
    try {
      await deleteEvent({ accessToken, eventId: link.externalEventId });
    } catch (err) {
      console.warn(
        `[calendar.sync] deleteEvent fail task=${task.id}: ${(err as Error).message}`,
      );
    }
    await db
      .delete(schema.calendarEventLink)
      .where(eq(schema.calendarEventLink.id, link.id));
    stats.deleted++;
    return;
  }

  const googleUpdated = link.googleUpdatedAt ?? new Date(0);
  const winner = resolveSyncWinner({ task, link, googleUpdated });
  if (winner !== "push") return;

  const eventInput = taskToEventInput(task);
  const ev = await patchEvent({
    accessToken,
    eventId: link.externalEventId,
    event: eventInput,
  });
  const gUpdated = googleUpdatedForEvent(ev);
  await db
    .update(schema.calendarEventLink)
    .set({
      etag: ev.etag,
      googleUpdatedAt: gUpdated,
      lastSyncedAt: new Date(),
    })
    .where(eq(schema.calendarEventLink.id, link.id));
  stats.updated++;
}

async function pushUnlinkedOne(args: {
  account: CalendarAccount;
  accessToken: string;
  task: Task;
  stats: { inserted: number; updated: number; deleted: number };
}): Promise<void> {
  const { account, accessToken, task, stats } = args;
  if (!task.scheduledAt || task.deletedAt) return;

  const eventInput = taskToEventInput(task);
  const ev = await insertEvent({ accessToken, event: eventInput });
  const gUpdated = googleUpdatedForEvent(ev);
  await db.insert(schema.calendarEventLink).values({
    taskId: task.id,
    calendarAccountId: account.id,
    externalEventId: ev.id,
    etag: ev.etag,
    googleUpdatedAt: gUpdated,
    lastSyncedAt: new Date(),
  });
  stats.inserted++;
}

function taskToEventInput(task: Task) {
  return {
    summary: task.title,
    description: task.descriptionMarkdown ?? undefined,
    startIso: task.scheduledAt!.toISOString(),
    endIso: task.estimatedMinutes
      ? new Date(
          task.scheduledAt!.getTime() + task.estimatedMinutes * 60_000,
        ).toISOString()
      : undefined,
    cancelled: !!task.completedAt,
    taskId: task.id,
  };
}

async function markSynced(accountId: string): Promise<void> {
  await db
    .update(schema.calendarAccount)
    .set({ updatedAt: new Date() })
    .where(eq(schema.calendarAccount.id, accountId));
}

export async function syncAccountById(accountId: string): Promise<SyncStats | null> {
  const account = await db.query.calendarAccount.findFirst({
    where: eq(schema.calendarAccount.id, accountId),
  });
  if (!account) return null;
  return syncAccount(account);
}

export async function syncAllAccounts(): Promise<{
  accounts: number;
  inserted: number;
  updated: number;
  deleted: number;
  pulled: number;
}> {
  const due = await listAccountsDueForSync({ staleMinutes: 5 });
  const totals = {
    accounts: due.length,
    inserted: 0,
    updated: 0,
    deleted: 0,
    pulled: 0,
  };
  for (const acc of due) {
    try {
      const r = await syncAccount(acc);
      totals.inserted += r.pushed.inserted;
      totals.updated += r.pushed.updated + r.pulled.updated;
      totals.deleted += r.pushed.deleted + r.pulled.deleted;
      totals.pulled += r.pulled.imported;
    } catch (err) {
      console.error(
        `[calendar.sync] account ${acc.id} error: ${(err as Error).message}`,
      );
    }
  }
  return totals;
}
