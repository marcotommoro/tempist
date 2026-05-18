/**
 * GET /api/reports/time-entries.csv?range=week|month|last-week
 * (oppure ?from=ISO&to=ISO custom)
 *
 * Export delle time entries del workspace nel range scelto, formato RFC 4180.
 * Filtri opzionali: clientId, projectId.
 */

import { and, asc, eq, gte, lt } from "drizzle-orm";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { db, schema } from "@/lib/db";
import { buildCsv } from "@/lib/utils/csv";
import { computeReportRange, type Range } from "@/lib/utils/report-range";

export const dynamic = "force-dynamic";

function parseDateParam(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: Request): Promise<Response> {
  const { user, organizationId } = await requireActiveOrganization();
  const timezone =
    (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";

  const url = new URL(req.url);
  const rangeParam = url.searchParams.get("range");
  const fromParam = parseDateParam(url.searchParams.get("from"));
  const toParam = parseDateParam(url.searchParams.get("to"));
  const clientId = url.searchParams.get("clientId");
  const projectId = url.searchParams.get("projectId");

  let from: Date;
  let to: Date;
  let label: string;

  if (fromParam && toParam) {
    from = fromParam;
    to = toParam;
    label = `custom-${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;
  } else {
    const range: Range =
      rangeParam === "month"
        ? "month"
        : rangeParam === "last-week"
          ? "last-week"
          : "week";
    const r = computeReportRange(range, timezone);
    from = r.from;
    to = r.to;
    label = range;
  }

  const conds = [
    eq(schema.timeEntry.organizationId, organizationId),
    eq(schema.timeEntry.isRunning, false),
    gte(schema.timeEntry.startedAt, from),
    lt(schema.timeEntry.startedAt, to),
  ];
  if (clientId) conds.push(eq(schema.timeEntry.clientId, clientId));
  if (projectId) conds.push(eq(schema.timeEntry.projectId, projectId));

  const entries = await db
    .select({
      id: schema.timeEntry.id,
      startedAt: schema.timeEntry.startedAt,
      endedAt: schema.timeEntry.endedAt,
      durationSeconds: schema.timeEntry.durationSeconds,
      description: schema.timeEntry.description,
      isBillable: schema.timeEntry.isBillable,
      hourlyRateSnapshot: schema.timeEntry.hourlyRateSnapshot,
      currencySnapshot: schema.timeEntry.currencySnapshot,
      clientId: schema.timeEntry.clientId,
      projectId: schema.timeEntry.projectId,
      taskId: schema.timeEntry.taskId,
    })
    .from(schema.timeEntry)
    .where(and(...conds))
    .orderBy(asc(schema.timeEntry.startedAt));

  const csv = buildCsv(
    [
      "id",
      "started_at",
      "ended_at",
      "duration_seconds",
      "hours",
      "description",
      "is_billable",
      "hourly_rate",
      "currency",
      "billable_amount",
      "client_id",
      "project_id",
      "task_id",
    ],
    entries.map((e) => {
      const hours = (e.durationSeconds ?? 0) / 3600;
      const rate = e.hourlyRateSnapshot ? Number(e.hourlyRateSnapshot) : null;
      const amount = e.isBillable && rate != null ? (rate * hours).toFixed(2) : "";
      return [
        e.id,
        e.startedAt,
        e.endedAt,
        e.durationSeconds,
        hours.toFixed(4),
        e.description ?? "",
        e.isBillable ? "true" : "false",
        rate ?? "",
        e.currencySnapshot ?? "",
        amount,
        e.clientId ?? "",
        e.projectId ?? "",
        e.taskId ?? "",
      ];
    }),
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="time-entries-${label}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
