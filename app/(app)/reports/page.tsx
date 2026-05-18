import Link from "next/link";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listClients } from "@/lib/domain/clients";
import { listProjects } from "@/lib/domain/projects";
import { getClientAggregates } from "@/lib/domain/time-entries";
import { getCompletedTaskCountByClient } from "@/lib/domain/tasks";
import {
  getHoursByDay,
  getProjectBreakdown,
} from "@/lib/domain/analytics";
import {
  computeReportRange,
  fillDailyGaps,
  type Range,
} from "@/lib/utils/report-range";
import { HoursByDayChart } from "@/components/features/reports/hours-by-day-chart";
import { ClientPieChart } from "@/components/features/reports/client-pie-chart";
import { cn } from "@/lib/utils";

type Search = { range?: string };

function hoursFromSeconds(s: number): string {
  return (s / 3600).toFixed(2);
}

export default async function ReportsPage({
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

  const [
    clients,
    projects,
    aggregates,
    completedByClient,
    hoursByDay,
    projectBreakdown,
  ] = await Promise.all([
    listClients({ organizationId, includeArchived: true }),
    listProjects({ organizationId }),
    getClientAggregates({ organizationId, from, to }),
    getCompletedTaskCountByClient({ organizationId, from, to }),
    getHoursByDay({ organizationId, from, to }),
    getProjectBreakdown({ organizationId, from, to }),
  ]);

  type Row = {
    id: string | null;
    name: string;
    color: string;
    currency: string;
    totalSeconds: number;
    billableAmount: number;
    entryCount: number;
    completedTasks: number;
  };

  const rows: Row[] = clients.map((c) => {
    const agg = aggregates.get(c.id);
    return {
      id: c.id,
      name: c.name,
      color: c.color,
      currency: c.currency,
      totalSeconds: agg?.totalSeconds ?? 0,
      billableAmount: agg?.billableAmount ?? 0,
      entryCount: agg?.entryCount ?? 0,
      completedTasks: completedByClient.get(c.id) ?? 0,
    };
  });

  const meaningfulRows = rows.filter(
    (r) => r.totalSeconds > 0 || r.completedTasks > 0,
  );

  const totals = meaningfulRows.reduce(
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

  // Data per il bar chart: riempi i buchi
  const hoursByDayFilled = fillDailyGaps(
    hoursByDay,
    from,
    to,
    (day) => ({ day, totalSeconds: 0 }),
  ).map((d) => ({ day: d.day, hours: d.totalSeconds / 3600 }));

  // Data per il pie chart
  const pieData = meaningfulRows.map((r) => ({
    name: r.name,
    hours: r.totalSeconds / 3600,
    color: r.color,
  }));

  // Project breakdown rows
  const projectRows = projects
    .map((p) => {
      const agg = projectBreakdown.get(p.id);
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        totalSeconds: agg?.totalSeconds ?? 0,
        entryCount: agg?.entryCount ?? 0,
        billableAmount: agg?.billableAmount ?? 0,
      };
    })
    .filter((p) => p.totalSeconds > 0)
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <div className="flex items-center gap-2">
            <Link
              href={`/api/reports/time-entries.csv?range=${range}`}
              className="text-xs px-2 py-1 rounded border bg-card hover:bg-muted"
            >
              Export CSV
            </Link>
            <Link
              href={`/reports/print?range=${range}`}
              className="text-xs px-2 py-1 rounded border bg-card hover:bg-muted"
            >
              Versione stampa
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <RangeToggle current={range} />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </header>

      {/* Totali del range */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Ore totali" value={hoursFromSeconds(totals.totalSeconds)} />
        <Stat label="Voci" value={String(totals.entryCount)} />
        <Stat label="Task completati" value={String(totals.completedTasks)} />
        <Stat
          label="Fatturabile"
          value={
            totals.billableByCurrency.size === 0
              ? "—"
              : Array.from(totals.billableByCurrency.entries())
                  .map(([cur, amt]) => `${amt.toFixed(2)} ${cur}`)
                  .join(" · ")
          }
        />
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md border bg-card p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Ore per giorno
          </h3>
          <HoursByDayChart data={hoursByDayFilled} />
        </div>
        <div className="rounded-md border bg-card p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Distribuzione clienti
          </h3>
          <ClientPieChart data={pieData} />
        </div>
      </section>

      {/* Tabella per cliente */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Per cliente
        </h2>
        <div className="rounded-md border bg-card overflow-x-auto">
          {meaningfulRows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nessuna attività registrata nel range selezionato.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">Cliente</th>
                  <th className="text-right font-medium px-4 py-2">Task completati</th>
                  <th className="text-right font-medium px-4 py-2">Ore</th>
                  <th className="text-right font-medium px-4 py-2">Voci</th>
                  <th className="text-right font-medium px-4 py-2">Fatturabile</th>
                </tr>
              </thead>
              <tbody>
                {meaningfulRows.map((r) => (
                  <tr key={r.id ?? "_"} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2">
                      {r.id ? (
                        <Link
                          href={`/clients/${r.id}`}
                          className="inline-flex items-center gap-2 hover:underline"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: r.color }}
                            aria-hidden
                          />
                          {r.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{r.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.completedTasks}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {hoursFromSeconds(r.totalSeconds)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {r.entryCount}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.billableAmount > 0
                        ? `${r.billableAmount.toFixed(2)} ${r.currency}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Tabella per progetto */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Per progetto
        </h2>
        <div className="rounded-md border bg-card overflow-x-auto">
          {projectRows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nessun progetto con tracking nel range.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">Progetto</th>
                  <th className="text-right font-medium px-4 py-2">Ore</th>
                  <th className="text-right font-medium px-4 py-2">Voci</th>
                  <th className="text-right font-medium px-4 py-2">Fatturabile</th>
                </tr>
              </thead>
              <tbody>
                {projectRows.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2">
                      <Link
                        href={`/projects/${p.id}`}
                        className="inline-flex items-center gap-2 hover:underline"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                          aria-hidden
                        />
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {hoursFromSeconds(p.totalSeconds)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {p.entryCount}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {p.billableAmount > 0 ? p.billableAmount.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function RangeToggle({ current }: { current: Range }) {
  const options: { value: Range; label: string }[] = [
    { value: "week", label: "Settimana" },
    { value: "last-week", label: "Scorsa" },
    { value: "month", label: "Mese" },
  ];
  return (
    <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
      {options.map((o) => (
        <Link
          key={o.value}
          href={`/reports?range=${o.value}`}
          className={cn(
            "px-3 py-1 rounded",
            current === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
