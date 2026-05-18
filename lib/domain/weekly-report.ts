/**
 * Weekly report: invio email del riepilogo della settimana precedente,
 * scheduled lunedì @08:00 user-tz. Stesso pattern del digest:
 *   - cron hourly globale
 *   - filtro internamente per giorno=lunedì + ora=08 nella tz
 *   - dedupe via notification "Weekly:" creata oggi local-tz
 */

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { toZonedTime } from "date-fns-tz";

import { db, schema } from "@/lib/db";
import { todayBoundsUtc } from "@/lib/utils/today-bounds";
import { computeReportRange } from "@/lib/utils/report-range";
import { sendEmail } from "@/lib/integrations/email";
import { createNotification } from "./notifications";
import { listClients } from "./clients";
import { getClientAggregates } from "./time-entries";
import { getCompletedTaskCountByClient } from "./tasks";
import {
  renderWeeklyReportHtml,
  renderWeeklyReportText,
  type WeeklyClientRow,
  type WeeklyReportData,
} from "@/lib/utils/weekly-report-render";

const TARGET_DAY = 1; // lunedì (date-fns: 0=domenica)
const TARGET_HOUR = 8;

type Candidate = { userId: string; email: string; organizationId: string; tz: string };

async function listCandidates(): Promise<Candidate[]> {
  const rows = await db
    .select({
      userId: schema.user.id,
      email: schema.user.email,
      organizationId: schema.member.organizationId,
      tz: schema.user.timezone,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId));
  return rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    organizationId: r.organizationId,
    tz: r.tz ?? "Europe/Rome",
  }));
}

function isTargetSlot(tz: string, now: Date): boolean {
  const local = toZonedTime(now, tz);
  return local.getDay() === TARGET_DAY && local.getHours() === TARGET_HOUR;
}

async function alreadySent(opts: {
  userId: string;
  organizationId: string;
  tz: string;
  now: Date;
}): Promise<boolean> {
  const { startUtc, endUtc } = todayBoundsUtc(opts.tz, opts.now);
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
        sql`${schema.notification.title} LIKE 'Weekly:%'`,
      ),
    );
  return Number(row?.count ?? 0) > 0;
}

export async function buildWeeklyReportData(opts: {
  organizationId: string;
  tz: string;
  now: Date;
}): Promise<WeeklyReportData> {
  const range = computeReportRange("last-week", opts.tz, opts.now);
  const [clients, aggregates, completedByClient] = await Promise.all([
    listClients({ organizationId: opts.organizationId, includeArchived: true }),
    getClientAggregates({
      organizationId: opts.organizationId,
      from: range.from,
      to: range.to,
    }),
    getCompletedTaskCountByClient({
      organizationId: opts.organizationId,
      from: range.from,
      to: range.to,
    }),
  ]);

  const rows: WeeklyClientRow[] = clients
    .map((c) => {
      const agg = aggregates.get(c.id);
      return {
        name: c.name,
        currency: c.currency,
        totalSeconds: agg?.totalSeconds ?? 0,
        billableAmount: agg?.billableAmount ?? 0,
        entryCount: agg?.entryCount ?? 0,
        completedTasks: completedByClient.get(c.id) ?? 0,
      };
    })
    .filter((r) => r.totalSeconds > 0 || r.completedTasks > 0)
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  const totals = rows.reduce(
    (acc, r) => {
      acc.totalSeconds += r.totalSeconds;
      acc.completedTasks += r.completedTasks;
      acc.billableByCurrency.set(
        r.currency,
        (acc.billableByCurrency.get(r.currency) ?? 0) + r.billableAmount,
      );
      return acc;
    },
    {
      totalSeconds: 0,
      completedTasks: 0,
      billableByCurrency: new Map<string, number>(),
    },
  );

  return {
    rangeLabel: range.label,
    rows,
    totalSeconds: totals.totalSeconds,
    completedTasks: totals.completedTasks,
    billableByCurrency: totals.billableByCurrency,
  };
}

export async function processWeeklyReport(now: Date = new Date()): Promise<{
  considered: number;
  sent: number;
}> {
  const candidates = await listCandidates();
  let sent = 0;
  for (const c of candidates) {
    if (!isTargetSlot(c.tz, now)) continue;
    if (await alreadySent({ userId: c.userId, organizationId: c.organizationId, tz: c.tz, now })) {
      continue;
    }
    const data = await buildWeeklyReportData({
      organizationId: c.organizationId,
      tz: c.tz,
      now,
    });
    await sendEmail({
      to: c.email,
      subject: `Report settimanale — ${data.rangeLabel}`,
      text: renderWeeklyReportText(data),
      html: renderWeeklyReportHtml(data),
    });
    await createNotification({
      organizationId: c.organizationId,
      userId: c.userId,
      type: "system",
      title: `Weekly: ${data.rangeLabel}`,
      body: `${data.rows.length} clienti, ${(data.totalSeconds / 3600).toFixed(1)}h totali`,
    });
    sent++;
  }
  return { considered: candidates.length, sent };
}

/** Manual trigger (settings button). */
export async function sendWeeklyReportNow(opts: {
  userEmail: string;
  organizationId: string;
  tz: string;
}): Promise<void> {
  const data = await buildWeeklyReportData({
    organizationId: opts.organizationId,
    tz: opts.tz,
    now: new Date(),
  });
  await sendEmail({
    to: opts.userEmail,
    subject: `Report settimanale (manuale) — ${data.rangeLabel}`,
    text: renderWeeklyReportText(data),
    html: renderWeeklyReportHtml(data),
  });
}

