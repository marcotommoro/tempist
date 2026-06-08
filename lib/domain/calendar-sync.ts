import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { CalendarAccount, Task } from "@/lib/db/schema";
import {
  getValidAccessToken,
  listAccountsDueForSync,
} from "@/lib/domain/calendar-accounts";
import { googleUpdatedForEvent, resolveSyncWinner } from "@/lib/domain/calendar-conflict";
import { htmlToText } from "@/lib/utils/html";
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

const EMPTY_STATS: SyncStats = {
  pulled: { imported: 0, updated: 0, deleted: 0 },
  pushed: { inserted: 0, updated: 0, deleted: 0 },
};

/**
 * Esegue `fn` tenendo un advisory lock Postgres legato all'account.
 *
 * Pull e push sono check-then-act (leggono "manca il link" → creano evento/task):
 * due sync concorrenti — callback in-process, job del webhook nel worker, tick del
 * cron, anche su processi diversi — duplicherebbero eventi Google e task. Il lock
 * serializza per account. È un *try*-lock: se un altro sync è già in corso si salta,
 * perché quel sync copre già lo stesso lavoro.
 *
 * `pg_try_advisory_xact_lock` lega il lock alla transazione: resta preso per tutta
 * la durata di `fn` e viene rilasciato automaticamente al commit/rollback. La
 * transazione non scrive nulla — pull/push usano il pool normale: serve solo a
 * tenere il lock vivo. `hashtextextended` mappa l'id testuale dell'account al
 * bigint richiesto dal lock.
 */
async function withAccountSyncLock<T>(
  accountId: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  return db.transaction(async (tx) => {
    const res = await tx.execute(
      sql`select pg_try_advisory_xact_lock(hashtextextended(${`calendar_sync:${accountId}`}, 0)) as locked`,
    );
    const locked = (res.rows[0] as { locked: boolean } | undefined)?.locked === true;
    if (!locked) {
      console.warn(`[calendar.sync] account=${accountId} skip: sync già in corso`);
      return null;
    }
    return fn();
  });
}

export async function syncAccount(account: CalendarAccount): Promise<SyncStats> {
  const result = await withAccountSyncLock(account.id, async () => {
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
  });

  return result ?? EMPTY_STATS;
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
    description: htmlToText(task.descriptionMarkdown) ?? undefined,
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
