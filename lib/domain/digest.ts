/**
 * Daily digest builder + sender.
 *
 * Per ogni user attivo (membro di almeno una org), il digest mostra per
 * l'organization corrente: task di oggi, reminder pending entro oggi,
 * ore tracciate ieri.
 *
 * Trigger guard: notification `digest.sent` creata oggi (local-tz) → skip.
 * In questo modo possiamo eseguire l'hourly cron senza paura di dup.
 */

import { and, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { db, schema } from "@/lib/db";
import type { User } from "@/lib/db/schema";
import { todayBoundsUtc } from "@/lib/utils/today-bounds";
import { sendEmail } from "@/lib/integrations/email";
import { createNotification } from "./notifications";
import {
  renderDigestHtml,
  renderDigestText,
  type DigestData,
} from "@/lib/utils/digest-render";
import { computeTriggerTime } from "@/lib/utils/reminder-time";

const DIGEST_TARGET_LOCAL_HOUR = 8;

type UserWithOrg = {
  user: User;
  organizationId: string;
};

/**
 * Lista utenti candidati al digest: per ogni org del workspace ritorna
 * (user, organizationId). Un user in 2 org riceve 2 digest separati.
 */
export async function listDigestCandidates(): Promise<UserWithOrg[]> {
  const rows = await db
    .select({ user: schema.user, organizationId: schema.member.organizationId })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId));
  return rows.map((r) => ({ user: r.user, organizationId: r.organizationId }));
}

function isDigestHourInTz(tz: string, now: Date = new Date()): boolean {
  const local = toZonedTime(now, tz);
  return local.getHours() === DIGEST_TARGET_LOCAL_HOUR;
}

async function alreadySentToday(opts: {
  userId: string;
  organizationId: string;
  timezone: string;
  now: Date;
}): Promise<boolean> {
  const { startUtc, endUtc } = todayBoundsUtc(opts.timezone, opts.now);
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.notification)
    .where(
      and(
        eq(schema.notification.userId, opts.userId),
        eq(schema.notification.organizationId, opts.organizationId),
        eq(schema.notification.type, "system"),
        gte(schema.notification.createdAt, startUtc),
        lt(schema.notification.createdAt, endUtc),
        // marcatore digest: title prefisso
        sql`${schema.notification.title} LIKE 'Digest:%'`,
      ),
    );
  return Number(row?.count ?? 0) > 0;
}

export async function buildDigestData(opts: {
  organizationId: string;
  timezone: string;
  userId: string;
  now: Date;
}): Promise<DigestData> {
  const { startUtc, endUtc } = todayBoundsUtc(opts.timezone, opts.now);
  const dayBefore = addDays(startUtc, -1);

  const tasksToday = await db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, opts.organizationId),
      isNull(schema.task.completedAt),
      isNull(schema.task.deletedAt),
      isNotNull(schema.task.scheduledAt),
      gte(schema.task.scheduledAt, startUtc),
      lt(schema.task.scheduledAt, endUtc),
    ),
  });

  // Reminders pending il cui trigger time cade entro oggi
  const rems = await db
    .select({ reminder: schema.reminder, task: schema.task })
    .from(schema.reminder)
    .innerJoin(schema.task, eq(schema.reminder.taskId, schema.task.id))
    .where(
      and(
        isNull(schema.reminder.sentAt),
        eq(schema.task.organizationId, opts.organizationId),
        isNull(schema.task.deletedAt),
      ),
    );

  const remindersDue: DigestData["remindersDue"] = [];
  for (const r of rems) {
    const t = computeTriggerTime({
      triggerType: r.reminder.triggerType,
      triggerValue: r.reminder.triggerValue,
      taskScheduledAt: r.task.scheduledAt,
    });
    if (t && t >= startUtc && t < endUtc) {
      remindersDue.push({ taskTitle: r.task.title, triggerAt: t });
    }
  }

  // Ore tracciate ieri (durationSeconds) per questo user
  const [yest] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${schema.timeEntry.durationSeconds}), 0)::int`,
    })
    .from(schema.timeEntry)
    .where(
      and(
        eq(schema.timeEntry.organizationId, opts.organizationId),
        eq(schema.timeEntry.userId, opts.userId),
        eq(schema.timeEntry.isRunning, false),
        gte(schema.timeEntry.startedAt, dayBefore),
        lt(schema.timeEntry.startedAt, startUtc),
      ),
    );

  return {
    date: format(toZonedTime(opts.now, opts.timezone), "EEEE d MMMM"),
    tasksToday,
    remindersDue,
    yesterdayTrackedSeconds: Number(yest?.total ?? 0),
  };
}

/**
 * Main runner: itera candidati, filtra per ora locale + dedupe, manda email,
 * crea notification "Digest:" (recordo di invio).
 */
export async function processDailyDigest(now: Date = new Date()): Promise<{
  considered: number;
  sent: number;
}> {
  const candidates = await listDigestCandidates();
  let sent = 0;
  for (const c of candidates) {
    const tz =
      (c.user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";
    if (!isDigestHourInTz(tz, now)) continue;
    if (
      await alreadySentToday({
        userId: c.user.id,
        organizationId: c.organizationId,
        timezone: tz,
        now,
      })
    ) {
      continue;
    }
    const data = await buildDigestData({
      organizationId: c.organizationId,
      timezone: tz,
      userId: c.user.id,
      now,
    });
    // Niente task di oggi né promemoria in scadenza → nessuna email.
    if (data.tasksToday.length === 0 && data.remindersDue.length === 0) {
      continue;
    }
    await sendEmail({
      to: c.user.email,
      subject: `Digest — ${data.date}`,
      text: renderDigestText(data),
      html: renderDigestHtml(data),
    });
    await createNotification({
      organizationId: c.organizationId,
      userId: c.user.id,
      type: "system",
      title: `Digest: ${data.date}`,
      body: `${data.tasksToday.length} task, ${data.remindersDue.length} promemoria`,
    });
    sent++;
  }
  return { considered: candidates.length, sent };
}

/** Versione "forza invio adesso" usata dall'azione manuale in /settings.
 *  Input volutamente largo per accettare sia il tipo User di schema sia il
 *  Better Auth user (lievemente diverso su `image`). */
export async function sendDigestNow(opts: {
  user: { id: string; email: string; timezone?: string };
  organizationId: string;
}): Promise<void> {
  const tz = opts.user.timezone ?? "Europe/Rome";
  const now = new Date();
  const data = await buildDigestData({
    organizationId: opts.organizationId,
    timezone: tz,
    userId: opts.user.id,
    now,
  });
  await sendEmail({
    to: opts.user.email,
    subject: `Digest (manuale) — ${data.date}`,
    text: renderDigestText(data),
    html: renderDigestHtml(data),
  });
}
