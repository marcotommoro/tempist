/**
 * Calendar sync (push-only): task → Google Calendar event.
 *
 * Strategia per ogni `calendar_account`:
 *  1. Trova task con updatedAt > account.updatedAt (= "last sync") AND
 *     scheduledAt IS NOT NULL nello stesso organizationId.
 *  2. Per ognuno controlla `calendar_event_link`:
 *     - link inesistente + task non cancellato → POST insert, crea link
 *     - link esistente + task non cancellato → PATCH update event
 *     - link esistente + task cancellato → DELETE event, rimuovi link
 *  3. Aggiorna account.updatedAt = now.
 *
 * Non gestiamo conflict da pull (no inversione direzione in questa fase).
 */

import { and, eq, gt, isNotNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { CalendarAccount, Task } from "@/lib/db/schema";
import {
  deleteEvent,
  insertEvent,
  patchEvent,
} from "@/lib/integrations/google-calendar";
import {
  getValidAccessToken,
  listAccountsDueForSync,
} from "./calendar-accounts";

export async function syncAccount(account: CalendarAccount): Promise<{
  inserted: number;
  updated: number;
  deleted: number;
}> {
  const stats = { inserted: 0, updated: 0, deleted: 0 };

  // Task aggiornati dopo l'ultimo sync (account.updatedAt)
  const since = account.updatedAt ?? new Date(0);
  const candidates = await db
    .select()
    .from(schema.task)
    .where(
      and(
        eq(schema.task.organizationId, account.organizationId),
        gt(schema.task.updatedAt, since),
        isNotNull(schema.task.scheduledAt),
      ),
    );

  if (candidates.length === 0) {
    await markSynced(account.id);
    return stats;
  }

  const accessToken = await getValidAccessToken(account);

  for (const task of candidates) {
    await syncOne({ account, accessToken, task, stats });
  }

  await markSynced(account.id);
  return stats;
}

async function syncOne(args: {
  account: CalendarAccount;
  accessToken: string;
  task: Task;
  stats: { inserted: number; updated: number; deleted: number };
}): Promise<void> {
  const { account, accessToken, task, stats } = args;

  const link = await db.query.calendarEventLink.findFirst({
    where: and(
      eq(schema.calendarEventLink.taskId, task.id),
      eq(schema.calendarEventLink.calendarAccountId, account.id),
    ),
  });

  // Task soft-deleted o senza scheduledAt → DELETE event se link esiste
  const shouldExist = !task.deletedAt && task.scheduledAt != null;

  if (!shouldExist) {
    if (link) {
      try {
        await deleteEvent({ accessToken, eventId: link.externalEventId });
      } catch (err) {
        console.warn(
          `[calendar.sync] deleteEvent fail per task ${task.id}: ${(err as Error).message}`,
        );
      }
      await db
        .delete(schema.calendarEventLink)
        .where(eq(schema.calendarEventLink.id, link.id));
      stats.deleted++;
    }
    return;
  }

  const eventInput = {
    summary: task.title,
    description: task.descriptionMarkdown ?? undefined,
    startIso: task.scheduledAt!.toISOString(),
    endIso: task.estimatedMinutes
      ? new Date(
          task.scheduledAt!.getTime() + task.estimatedMinutes * 60_000,
        ).toISOString()
      : undefined,
    cancelled: !!task.completedAt,
  };

  if (link) {
    const ev = await patchEvent({
      accessToken,
      eventId: link.externalEventId,
      event: eventInput,
    });
    await db
      .update(schema.calendarEventLink)
      .set({ etag: ev.etag, lastSyncedAt: new Date() })
      .where(eq(schema.calendarEventLink.id, link.id));
    stats.updated++;
  } else {
    const ev = await insertEvent({ accessToken, event: eventInput });
    await db.insert(schema.calendarEventLink).values({
      taskId: task.id,
      calendarAccountId: account.id,
      externalEventId: ev.id,
      etag: ev.etag,
      lastSyncedAt: new Date(),
    });
    stats.inserted++;
  }
}

async function markSynced(accountId: string): Promise<void> {
  await db
    .update(schema.calendarAccount)
    .set({ updatedAt: new Date() })
    .where(eq(schema.calendarAccount.id, accountId));
}

/**
 * Runner per il job pg-boss: itera tutti gli account, syncha ognuno
 * indipendentemente (errori non bloccano gli altri).
 */
export async function syncAllAccounts(): Promise<{
  accounts: number;
  inserted: number;
  updated: number;
  deleted: number;
}> {
  const due = await listAccountsDueForSync({ staleMinutes: 5 });
  const totals = { accounts: due.length, inserted: 0, updated: 0, deleted: 0 };
  for (const acc of due) {
    try {
      const r = await syncAccount(acc);
      totals.inserted += r.inserted;
      totals.updated += r.updated;
      totals.deleted += r.deleted;
    } catch (err) {
      console.error(
        `[calendar.sync] account ${acc.id} error: ${(err as Error).message}`,
      );
    }
  }
  return totals;
}
