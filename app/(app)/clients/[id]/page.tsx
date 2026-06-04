import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  addDays,
  endOfMonth,
  endOfYear,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import { Mail, Pencil, Receipt } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getClient, listClients } from "@/lib/domain/clients";
import { listProjects } from "@/lib/domain/projects";
import {
  getProjectAggregatesForClient,
  getTrackedSecondsByTask,
  listQuickGridDataForClient,
  listTimeEntriesForClient,
} from "@/lib/domain/time-entries";
import { getTasksForClient } from "@/lib/domain/tasks";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { EditClientDialog } from "@/components/features/clients/edit-client-dialog";
import { TimeEntryRow } from "@/components/features/timer/time-entry-row";
import { ManualEntryForm } from "@/components/features/timer/manual-entry-form";
import { ClientBillingFilters } from "@/components/features/timer/client-billing-filters";
import { ClientQuickEntryGrid } from "@/components/features/timer/client-quick-entry-grid";
import { QuickStartButton } from "@/components/features/timer/quick-start-button";
import { TaskList } from "@/components/features/tasks/task-list";
import { CreateTaskDialog } from "@/components/features/tasks/create-task-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";
import { userTimezone } from "@/lib/utils/default-task-scheduled-at";
import { PageHeader } from "@/components/features/page-header/page-header";

type Params = { id: string };
type Search = {
  from?: string;
  to?: string;
  preset?: "month" | "last-month" | "all";
  week?: string;
};

type ResolvedRange = {
  from: Date;
  to: Date;
  active: "month" | "last-month" | "all" | "custom";
};

function safeParse(s: string): Date | null {
  const d = parseISO(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveRange(s: Search): ResolvedRange {
  const fromParam = s.from ? safeParse(s.from) : null;
  const toParam = s.to ? safeParse(s.to) : null;
  if (fromParam && toParam) {
    return { from: fromParam, to: toParam, active: "custom" };
  }
  const now = new Date();
  if (s.preset === "last-month") {
    const lastMonth = subMonths(now, 1);
    return {
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
      active: "last-month",
    };
  }
  if (s.preset === "all") {
    // 5 anni indietro fino a fine anno corrente — sufficiente come "tutto"
    return {
      from: startOfYear(subMonths(now, 60)),
      to: endOfYear(now),
      active: "all",
    };
  }
  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
    active: "month",
  };
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { user, organizationId } = await requireActiveOrganization();
  const tz = userTimezone(user as { timezone?: string | null });
  const client = await getClient({ clientId: id, organizationId });
  if (!client) notFound();

  const { from, to, active } = resolveRange(sp);

  const weekStart = sp.week
    ? (safeParse(sp.week) ?? startOfWeek(new Date(), { weekStartsOn: 1 }))
    : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  const [entries, clients, projects, projectAggregates, quickGrid] =
    await Promise.all([
      listTimeEntriesForClient({
        clientId: id,
        organizationId,
        from,
        to,
      }),
      listClients({ organizationId }),
      listProjects({ organizationId }),
      getProjectAggregatesForClient({
        organizationId,
        clientId: id,
        from,
        to,
      }),
      listQuickGridDataForClient({
        organizationId,
        userId: user.id,
        clientId: id,
        weekStart,
        weekEnd,
      }),
    ]);

  const clientProjects: { id: string | null; name: string }[] = projects
    .filter((p) => p.clientId === id)
    .map((p) => ({ id: p.id, name: p.name }));

  const managedByCell = new Map<string, number>();
  for (const m of quickGrid.managed) {
    const key = `${m.dayKey}::${m.projectId ?? ""}`;
    managedByCell.set(key, (managedByCell.get(key) ?? 0) + m.durationSeconds);
  }
  const gridCells = quickGrid.summary.map((s) => ({
    dayKey: s.dayKey,
    projectId: s.projectId,
    totalSeconds: s.totalSeconds,
    managedSeconds: managedByCell.get(`${s.dayKey}::${s.projectId ?? ""}`) ?? 0,
  }));

  const clientPicks = clients.map((c) => ({ id: c.id, name: c.name }));
  const projectPicks = projects.map((p) => ({
    id: p.id,
    name: p.name,
    clientId: p.clientId,
  }));

  const tasks = await getTasksForClient({
    organizationId,
    clientId: id,
    includeCompleted: true,
    limit: 50,
  });
  const taskIds = tasks.map((t) => t.id);
  const [trackedByTask, remindersByTask] = await Promise.all([
    getTrackedSecondsByTask({ organizationId, taskIds }),
    getPendingReminderCountByTask(taskIds),
  ]);

  // Totali per il cliente — split billable/internal per dare visibilità al non-fatturabile
  const totals = entries.reduce(
    (acc, e) => {
      const dur = e.durationSeconds ?? 0;
      acc.totalSeconds += dur;
      if (e.isBillable) {
        acc.billableSeconds += dur;
        if (e.hourlyRateSnapshot) {
          acc.billableAmount += Number(e.hourlyRateSnapshot) * (dur / 3600);
        }
      } else {
        acc.internalSeconds += dur;
      }
      return acc;
    },
    {
      totalSeconds: 0,
      billableSeconds: 0,
      internalSeconds: 0,
      billableAmount: 0,
    },
  );

  const projectsById = new Map(projects.map((p) => [p.id, p.name]));
  const aggregatesSorted = [...projectAggregates].sort(
    (a, b) => b.totalSeconds - a.totalSeconds,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        className="pt-4 pb-3 mb-4"
        title={client.name}
        actions={
          <div className="flex items-center gap-2">
            <QuickStartButton target={{ kind: "client", id, label: client.name }} />
            <EditClientDialog
              client={client}
              trigger={
                <Button type="button" variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="size-3.5" />
                  Modifica
                </Button>
              }
            />
          </div>
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 normal-case tracking-normal">
            {client.email && (
              <span className="inline-flex items-center gap-1.5 normal-case">
                <Mail className="h-3 w-3" />
                <span className="text-foreground">{client.email}</span>
              </span>
            )}
            {client.vatNumber && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono uppercase tracking-wider">
                  P.IVA <span className="text-foreground">{client.vatNumber}</span>
                </span>
              </>
            )}
            {client.hourlyRateDefault && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5 normal-case">
                  <Receipt className="h-3 w-3" />
                  <span className="font-mono tabular-nums text-foreground">
                    {client.hourlyRateDefault} {client.currency}/h
                  </span>
                </span>
              </>
            )}
          </div>
        }
      />

      {/* KPI a sinistra + filtri a destra su un'unica riga */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Totali — strip KPI compatto, a sinistra */}
        <section className="flex items-stretch divide-x divide-border overflow-hidden rounded-lg border border-border bg-card">
          <CompactKpi label="Hours" value={formatDuration(totals.totalSeconds)} />
          <CompactKpi
            label="Billable"
            accent="billable"
            value={formatDuration(totals.billableSeconds)}
          />
          <CompactKpi label="Internal" value={formatDuration(totals.internalSeconds)} />
          <CompactKpi
            label={`Amount (${client.currency})`}
            accent="coral"
            value={totals.billableAmount.toFixed(2)}
          />
        </section>

        <ClientBillingFilters
          clientId={id}
          from={from}
          to={to}
          presetActive={active}
        />
      </div>

      <ClientQuickEntryGrid
        clientId={id}
        projects={clientProjects}
        weekStart={weekStart}
        cells={gridCells}
        basePath={`/clients/${id}`}
        preservedParams={{
          ...(sp.from ? { from: sp.from } : {}),
          ...(sp.to ? { to: sp.to } : {}),
          ...(sp.preset ? { preset: sp.preset } : {}),
        }}
      />

      {aggregatesSorted.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-border pb-1.5">
            <h2 className="section-heading text-muted-foreground">
              Breakdown per progetto
            </h2>
            <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
              {String(aggregatesSorted.length).padStart(2, "0")}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-eyebrow">
                  <th className="px-4 py-2 font-normal">Progetto</th>
                  <th className="px-4 py-2 text-right font-normal">Ore</th>
                  <th className="px-4 py-2 text-right font-normal">Voci</th>
                  <th className="px-4 py-2 text-right font-normal">
                    Importo ({client.currency})
                  </th>
                </tr>
              </thead>
              <tbody>
                {aggregatesSorted.map((agg) => (
                  <tr
                    key={agg.projectId ?? "__no_project__"}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-2 text-foreground">
                      {agg.projectId
                        ? (projectsById.get(agg.projectId) ?? "—")
                        : (
                          <span className="font-serif italic text-muted-foreground">
                            Senza progetto
                          </span>
                        )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground">
                      {formatDuration(agg.totalSeconds)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                      {agg.entryCount}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground">
                      {agg.billableAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ManualEntryForm clientId={id} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-border pb-1.5">
          <h2 className="section-heading text-muted-foreground">
            Tasks
          </h2>
          <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
            {String(tasks.length).padStart(2, "0")}
          </span>
        </div>
        <CreateTaskDialog defaultClientId={id} timezone={tz} />
        <TaskList
          tasks={tasks}
          trackedByTask={trackedByTask}
          remindersByTask={remindersByTask}
          emptyMessage="Nessun task legato a questo cliente."
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-border pb-1.5">
          <h2 className="section-heading text-muted-foreground">
            Time entries
          </h2>
          <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
            {String(entries.length).padStart(2, "0")}
          </span>
        </div>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {entries.length > 0 ? (
            <ul className="divide-y divide-border">
              {entries.map((e) => (
                <TimeEntryRow
                  key={e.id}
                  entry={e}
                  clients={clientPicks}
                  projects={projectPicks}
                  userTimezone={tz}
                />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center font-serif text-lg italic text-muted-foreground">
              Nessuna voce di tracking ancora.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

/** Cella KPI compatta: label mono + valore tabular su una sola riga. */
function CompactKpi({
  label,
  value,
  accent,
}: {
  label: ReactNode;
  value: ReactNode;
  accent?: "coral" | "billable";
}) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap px-2.5 py-1.5">
      <span className="text-eyebrow">{label}</span>
      <span
        className={cn(
          "font-mono text-xs font-medium tabular-nums text-foreground",
          accent === "coral" && "text-coral",
          accent === "billable" && "text-billable",
        )}
      >
        {value}
      </span>
    </div>
  );
}
