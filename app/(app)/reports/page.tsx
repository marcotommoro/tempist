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
import { EntityColorMarker } from "@/components/features/entity-color-marker";
import { PageHeader } from "@/components/features/page-header/page-header";

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
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        meta={<span className="text-foreground">{label}</span>}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/api/reports/time-entries.csv?range=${range}`}
              className="inline-flex h-8 items-center rounded-md border border-border bg-transparent px-2.5 font-mono text-[0.625em] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Export CSV
            </Link>
            <Link
              href={`/reports/print?range=${range}`}
              className="inline-flex h-8 items-center rounded-md border border-border bg-transparent px-2.5 font-mono text-[0.625em] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Print
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <RangeToggle current={range} />
      </div>

      {/* Totali del range — editorial KPI grid */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-4">
        <Stat label="Hours" value={hoursFromSeconds(totals.totalSeconds)} />
        <Stat label="Entries" value={String(totals.entryCount)} />
        <Stat label="Completed" value={String(totals.completedTasks)} />
        <Stat
          label="Billable"
          accent
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
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard title="Hours per day">
          <HoursByDayChart data={hoursByDayFilled} />
        </ChartCard>
        <ChartCard title="Client distribution">
          <ClientPieChart data={pieData} />
        </ChartCard>
      </section>

      {/* Tabella per cliente */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-border pb-1.5">
          <h2 className="section-heading text-muted-foreground">
            By client
          </h2>
          <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
            {String(meaningfulRows.length).padStart(2, "0")}
          </span>
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          {meaningfulRows.length === 0 ? (
            <p className="px-4 py-8 text-center font-display text-base italic text-muted-foreground">
              Nessuna attività registrata nel range selezionato.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-eyebrow">
                  <th className="px-4 py-2.5 text-left font-medium">Client</th>
                  <th className="px-4 py-2.5 text-right font-medium">Done</th>
                  <th className="px-4 py-2.5 text-right font-medium">Hours</th>
                  <th className="px-4 py-2.5 text-right font-medium">Entries</th>
                  <th className="px-4 py-2.5 text-right font-medium">Billable</th>
                </tr>
              </thead>
              <tbody>
                {meaningfulRows.map((r) => (
                  <tr
                    key={r.id ?? "_"}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-2.5">
                      {r.id ? (
                        <Link
                          href={`/clients/${r.id}`}
                          className="inline-flex items-center gap-2 text-[0.8125em] hover:text-coral"
                        >
                          <EntityColorMarker kind="client" color={r.color} size="sm" />
                          {r.name}
                        </Link>
                      ) : (
                        <span className="font-display italic text-muted-foreground">
                          {r.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {r.completedTasks}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {hoursFromSeconds(r.totalSeconds)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {r.entryCount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {r.billableAmount > 0 ? (
                        <span className="text-foreground">
                          {r.billableAmount.toFixed(2)}{" "}
                          <span className="text-muted-foreground">{r.currency}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Tabella per progetto */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-border pb-1.5">
          <h2 className="section-heading text-muted-foreground">
            By project
          </h2>
          <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
            {String(projectRows.length).padStart(2, "0")}
          </span>
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          {projectRows.length === 0 ? (
            <p className="px-4 py-8 text-center font-display text-base italic text-muted-foreground">
              Nessun progetto con tracking nel range.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-eyebrow">
                  <th className="px-4 py-2.5 text-left font-medium">Project</th>
                  <th className="px-4 py-2.5 text-right font-medium">Hours</th>
                  <th className="px-4 py-2.5 text-right font-medium">Entries</th>
                  <th className="px-4 py-2.5 text-right font-medium">Billable</th>
                </tr>
              </thead>
              <tbody>
                {projectRows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/projects/${p.id}`}
                        className="inline-flex items-center gap-2 text-[0.8125em] hover:text-coral"
                      >
                        <EntityColorMarker kind="project" color={p.color} size="sm" />
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {hoursFromSeconds(p.totalSeconds)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {p.entryCount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {p.billableAmount > 0
                        ? p.billableAmount.toFixed(2)
                        : "—"}
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

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card p-4">
      <div className="text-eyebrow">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-display text-2xl leading-none tabular-nums md:text-3xl",
          accent ? "text-coral" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h3 className="section-heading-sm mb-3 text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function RangeToggle({ current }: { current: Range }) {
  const options: { value: Range; label: string }[] = [
    { value: "week", label: "Week" },
    { value: "last-week", label: "Last" },
    { value: "month", label: "Month" },
  ];
  return (
    <div className="inline-flex rounded-md border border-border bg-card/40 p-0.5 font-mono text-[0.625em] uppercase tracking-wider">
      {options.map((o) => (
        <Link
          key={o.value}
          href={`/reports?range=${o.value}`}
          className={cn(
            "rounded px-2.5 py-1 transition-colors",
            current === o.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
