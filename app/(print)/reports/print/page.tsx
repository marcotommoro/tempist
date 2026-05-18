import { format } from "date-fns";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listClients } from "@/lib/domain/clients";
import { listProjects } from "@/lib/domain/projects";
import { getClientAggregates } from "@/lib/domain/time-entries";
import { getCompletedTaskCountByClient } from "@/lib/domain/tasks";
import { getProjectBreakdown } from "@/lib/domain/analytics";
import { computeReportRange, type Range } from "@/lib/utils/report-range";
import { PrintButton } from "@/components/features/reports/print-button";

type Search = { range?: string };

function hoursFromSeconds(s: number): string {
  return (s / 3600).toFixed(2);
}

export default async function ReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { range: rangeParam } = await searchParams;
  const range: Range =
    rangeParam === "month"
      ? "month"
      : rangeParam === "last-week"
        ? "last-week"
        : "week";

  const { user, organizationId } = await requireActiveOrganization();
  const timezone =
    (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";

  const { from, to, label } = computeReportRange(range, timezone);

  const [clients, projects, aggregates, completedByClient, projectBreakdown] =
    await Promise.all([
      listClients({ organizationId, includeArchived: true }),
      listProjects({ organizationId }),
      getClientAggregates({ organizationId, from, to }),
      getCompletedTaskCountByClient({ organizationId, from, to }),
      getProjectBreakdown({ organizationId, from, to }),
    ]);

  const clientRows = clients
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
    .filter((r) => r.totalSeconds > 0 || r.completedTasks > 0);

  const projectRows = projects
    .map((p) => {
      const agg = projectBreakdown.get(p.id);
      return {
        name: p.name,
        totalSeconds: agg?.totalSeconds ?? 0,
        entryCount: agg?.entryCount ?? 0,
        billableAmount: agg?.billableAmount ?? 0,
      };
    })
    .filter((p) => p.totalSeconds > 0);

  const totals = clientRows.reduce(
    (acc, r) => {
      acc.totalSeconds += r.totalSeconds;
      acc.entryCount += r.entryCount;
      acc.completedTasks += r.completedTasks;
      acc.billableByCurrency.set(
        r.currency,
        (acc.billableByCurrency.get(r.currency) ?? 0) + r.billableAmount,
      );
      return acc;
    },
    {
      totalSeconds: 0,
      entryCount: 0,
      completedTasks: 0,
      billableByCurrency: new Map<string, number>(),
    },
  );

  return (
    <article className="space-y-4 text-sm">
      <header className="space-y-1 border-b pb-3 mb-3">
        <h1 className="text-xl font-bold">Report — {label}</h1>
        <p className="text-xs text-muted-foreground">
          Generato il {format(new Date(), "d MMM yyyy, HH:mm")} · {user.email}
        </p>
        <div className="print:hidden">
          <PrintButton />
        </div>
      </header>

      <section className="space-y-1">
        <h2 className="font-semibold">Riepilogo</h2>
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-0.5">Ore totali</td>
              <td className="text-right tabular-nums">
                {hoursFromSeconds(totals.totalSeconds)}
              </td>
            </tr>
            <tr>
              <td className="py-0.5">Voci</td>
              <td className="text-right tabular-nums">{totals.entryCount}</td>
            </tr>
            <tr>
              <td className="py-0.5">Task completati</td>
              <td className="text-right tabular-nums">{totals.completedTasks}</td>
            </tr>
            <tr>
              <td className="py-0.5">Fatturabile</td>
              <td className="text-right tabular-nums">
                {totals.billableByCurrency.size === 0
                  ? "—"
                  : Array.from(totals.billableByCurrency.entries())
                      .map(([cur, amt]) => `${amt.toFixed(2)} ${cur}`)
                      .join(" · ")}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="space-y-1 break-inside-avoid">
        <h2 className="font-semibold">Per cliente</h2>
        {clientRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessuna attività nel range.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-xs">
                <th className="text-left py-1">Cliente</th>
                <th className="text-right py-1">Task</th>
                <th className="text-right py-1">Ore</th>
                <th className="text-right py-1">Voci</th>
                <th className="text-right py-1">Fatturabile</th>
              </tr>
            </thead>
            <tbody>
              {clientRows.map((r) => (
                <tr key={r.name} className="border-b">
                  <td className="py-1">{r.name}</td>
                  <td className="py-1 text-right tabular-nums">{r.completedTasks}</td>
                  <td className="py-1 text-right tabular-nums">
                    {hoursFromSeconds(r.totalSeconds)}
                  </td>
                  <td className="py-1 text-right tabular-nums">{r.entryCount}</td>
                  <td className="py-1 text-right tabular-nums">
                    {r.billableAmount > 0
                      ? `${r.billableAmount.toFixed(2)} ${r.currency}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-1 break-inside-avoid">
        <h2 className="font-semibold">Per progetto</h2>
        {projectRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessun progetto con tracking.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-xs">
                <th className="text-left py-1">Progetto</th>
                <th className="text-right py-1">Ore</th>
                <th className="text-right py-1">Voci</th>
                <th className="text-right py-1">Fatturabile</th>
              </tr>
            </thead>
            <tbody>
              {projectRows.map((p) => (
                <tr key={p.name} className="border-b">
                  <td className="py-1">{p.name}</td>
                  <td className="py-1 text-right tabular-nums">
                    {hoursFromSeconds(p.totalSeconds)}
                  </td>
                  <td className="py-1 text-right tabular-nums">{p.entryCount}</td>
                  <td className="py-1 text-right tabular-nums">
                    {p.billableAmount > 0 ? p.billableAmount.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </article>
  );
}
