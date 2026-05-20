import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { CalendarAccount } from "@/lib/db/schema";
import {
  getValidAccessToken,
} from "@/lib/domain/calendar-accounts";
import { resolveSyncWinner } from "@/lib/domain/calendar-conflict";
import { createTask } from "@/lib/domain/tasks";
import {
  GoogleSyncTokenExpiredError,
  isGoogleEventInPast,
  listEventsIncremental,
  mapGoogleEventToTaskFields,
  parseGoogleUpdatedAt,
  resolveCalendarWebhookUrl,
  shouldImportGoogleEvent,
  stopWatchChannel,
  watchEvents,
  type GoogleEvent,
} from "@/lib/integrations/google-calendar";

const WATCH_RENEW_BEFORE_MS = 24 * 60 * 60 * 1000;

export type PullStats = {
  imported: number;
  updated: number;
  deleted: number;
};

export async function pullAccount(
  account: CalendarAccount,
): Promise<PullStats> {
  if (!account.pullEnabled) {
    return { imported: 0, updated: 0, deleted: 0 };
  }

  const stats: PullStats = { imported: 0, updated: 0, deleted: 0 };
  const accessToken = await getValidAccessToken(account);

  const syncToken = account.syncToken;
  let pageToken: string | null = null;
  let nextSyncToken: string | undefined;

  try {
    for (;;) {
      const page = await listEventsIncremental({
        accessToken,
        syncToken: pageToken ? null : (syncToken ?? null),
        pageToken,
      });

      for (const event of page.items ?? []) {
        const r = await applyGoogleEvent({ account, event });
        if (r === "imported") stats.imported++;
        else if (r === "updated") stats.updated++;
        else if (r === "deleted") stats.deleted++;
      }

      pageToken = page.nextPageToken ?? null;
      if (page.nextSyncToken) nextSyncToken = page.nextSyncToken;
      if (!pageToken) break;
    }
  } catch (err) {
    if (err instanceof GoogleSyncTokenExpiredError) {
      await db
        .update(schema.calendarAccount)
        .set({ syncToken: null })
        .where(eq(schema.calendarAccount.id, account.id));
      const reset = await db.query.calendarAccount.findFirst({
        where: eq(schema.calendarAccount.id, account.id),
      });
      if (!reset) return stats;
      return pullAccount(reset);
    }
    throw err;
  }

  if (nextSyncToken) {
    await db
      .update(schema.calendarAccount)
      .set({ syncToken: nextSyncToken })
      .where(eq(schema.calendarAccount.id, account.id));
  }

  return stats;
}

async function applyGoogleEvent(opts: {
  account: CalendarAccount;
  event: GoogleEvent;
}): Promise<"imported" | "updated" | "deleted" | "skipped"> {
  const { account, event } = opts;
  const googleUpdated = parseGoogleUpdatedAt(event);

  const link = await db.query.calendarEventLink.findFirst({
    where: and(
      eq(schema.calendarEventLink.calendarAccountId, account.id),
      eq(schema.calendarEventLink.externalEventId, event.id),
    ),
  });

  const isCancelled = event.status === "cancelled";

  if (link) {
    const task = await db.query.task.findFirst({
      where: eq(schema.task.id, link.taskId),
    });
    if (!task) {
      await db
        .delete(schema.calendarEventLink)
        .where(eq(schema.calendarEventLink.id, link.id));
      return "skipped";
    }

    if (isCancelled) {
      if (!task.deletedAt) {
        await db
          .update(schema.task)
          .set({ deletedAt: new Date(), updatedAt: googleUpdated })
          .where(eq(schema.task.id, task.id));
      }
      await touchLink(link.id, event, googleUpdated);
      return "deleted";
    }

    const winner = resolveSyncWinner({ task, link, googleUpdated });
    if (winner !== "pull") return "skipped";

    const fields = mapGoogleEventToTaskFields(event);
    if (!fields) return "skipped";

    await db
      .update(schema.task)
      .set({
        title: fields.title,
        descriptionMarkdown: fields.descriptionMarkdown,
        scheduledAt: fields.scheduledAt,
        estimatedMinutes: fields.estimatedMinutes,
        completedAt: fields.completedAt,
        updatedAt: googleUpdated,
      })
      .where(eq(schema.task.id, task.id));

    await touchLink(link.id, event, googleUpdated);
    return "updated";
  }

  if (isCancelled || !shouldImportGoogleEvent(event)) return "skipped";
  if (isGoogleEventInPast(event)) return "skipped";

  const fields = mapGoogleEventToTaskFields(event);
  if (!fields) return "skipped";

  const created = await createTask({
    organizationId: account.organizationId,
    createdById: account.userId,
    title: fields.title,
    descriptionMarkdown: fields.descriptionMarkdown,
    scheduledAt: fields.scheduledAt,
    estimatedMinutes: fields.estimatedMinutes,
    projectId: null,
  });

  await db
    .update(schema.task)
    .set({
      completedAt: fields.completedAt,
      updatedAt: googleUpdated,
    })
    .where(eq(schema.task.id, created.id));

  await db.insert(schema.calendarEventLink).values({
    taskId: created.id,
    calendarAccountId: account.id,
    externalEventId: event.id,
    etag: event.etag,
    googleUpdatedAt: googleUpdated,
    lastSyncedAt: new Date(),
  });

  return "imported";
}

async function touchLink(
  linkId: string,
  event: GoogleEvent,
  googleUpdated: Date,
): Promise<void> {
  await db
    .update(schema.calendarEventLink)
    .set({
      etag: event.etag,
      googleUpdatedAt: googleUpdated,
      lastSyncedAt: new Date(),
    })
    .where(eq(schema.calendarEventLink.id, linkId));
}

export async function ensureWatchChannel(
  account: CalendarAccount,
): Promise<void> {
  const webhookUrl = resolveCalendarWebhookUrl();
  if (!webhookUrl) return;

  const renewBy = Date.now() + WATCH_RENEW_BEFORE_MS;
  if (account.watchExpiresAt && account.watchExpiresAt.getTime() > renewBy) {
    return;
  }

  const accessToken = await getValidAccessToken(account);

  if (account.watchChannelId && account.watchResourceId) {
    try {
      await stopWatchChannel({
        accessToken,
        channelId: account.watchChannelId,
        resourceId: account.watchResourceId,
      });
    } catch (err) {
      console.warn(
        `[calendar.watch] stop fail account=${account.id}: ${(err as Error).message}`,
      );
    }
  }

  const channelId = randomUUID();
  const webhookToken = randomUUID();

  const channel = await watchEvents({
    accessToken,
    channelId,
    address: webhookUrl,
    token: webhookToken,
    ttlSeconds: 86400,
  });

  await db
    .update(schema.calendarAccount)
    .set({
      watchChannelId: channel.id,
      watchResourceId: channel.resourceId,
      watchExpiresAt: new Date(Number(channel.expiration)),
      watchWebhookToken: webhookToken,
    })
    .where(eq(schema.calendarAccount.id, account.id));
}

export async function findAccountByWatchChannel(opts: {
  channelId: string;
  resourceId: string;
}): Promise<CalendarAccount | null> {
  return (
    (await db.query.calendarAccount.findFirst({
      where: and(
        eq(schema.calendarAccount.watchChannelId, opts.channelId),
        eq(schema.calendarAccount.watchResourceId, opts.resourceId),
      ),
    })) ?? null
  );
}
