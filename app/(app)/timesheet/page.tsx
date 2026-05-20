import { format } from "date-fns";
import { it } from "date-fns/locale";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listClients } from "@/lib/domain/clients";
import { listProjects } from "@/lib/domain/projects";
import { listTimeEntriesForUser } from "@/lib/domain/time-entries";
import { TimesheetFilters } from "@/components/features/timer/timesheet-filters";
import { TimeEntryRow } from "@/components/features/timer/time-entry-row";
import { PageHeader } from "@/components/features/page-header/page-header";
import { formatDuration } from "@/lib/utils/format-duration";
import {
  formatWeekLabel,
  getWeekRange,
  parseWeekFromParam,
} from "@/lib/utils/timesheet-week";
import type { TimeEntry } from "@/lib/db/schema";

type Search = { from?: string; clientId?: string };

function groupByDay(entries: TimeEntry[]): Map<string, TimeEntry[]> {
  const groups = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const key = format(e.startedAt, "yyyy-MM-dd");
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return groups;
}

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { from: fromParam, clientId } = await searchParams;
  const { user, organizationId } = await requireActiveOrganization();

  const anchor = parseWeekFromParam(fromParam);
  const { from, to } = getWeekRange(anchor);
  const weekLabel = formatWeekLabel(from, to);

  const [entries, clients, projects] = await Promise.all([
    listTimeEntriesForUser({
      userId: user.id,
      organizationId,
      from,
      to,
      clientId: clientId || undefined,
    }),
    listClients({ organizationId }),
    listProjects({ organizationId }),
  ]);

  const totals = entries.reduce(
    (acc, e) => {
      const dur = e.durationSeconds ?? 0;
      acc.totalSeconds += dur;
      if (e.isBillable && e.hourlyRateSnapshot) {
        acc.billable += Number(e.hourlyRateSnapshot) * (dur / 3600);
      }
      return acc;
    },
    { totalSeconds: 0, billable: 0 },
  );

  const byDay = groupByDay(entries);
  const dayKeys = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

  const clientPicks = clients.map((c) => ({ id: c.id, name: c.name }));
  const projectPicks = projects.map((p) => ({
    id: p.id,
    name: p.name,
    clientId: p.clientId,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Time"
        title="Timesheet"
        meta={
          <TimesheetFilters
            weekFrom={from}
            weekLabel={weekLabel}
            clients={clientPicks}
            clientId={clientId}
          />
        }
      />

      <section className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border">
        <Stat label="Hours" value={formatDuration(totals.totalSeconds)} />
        <Stat label="Billable" value={totals.billable.toFixed(2)} accent />
        <Stat label="Entries" value={String(entries.length)} />
      </section>

      <section className="space-y-6">
        {dayKeys.length > 0 ? (
          dayKeys.map((dayKey) => {
            const dayEntries = byDay.get(dayKey) ?? [];
            const dayDate = dayEntries[0]!.startedAt;
            return (
              <div key={dayKey} className="space-y-2">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {format(dayDate, "EEEE d MMMM yyyy", { locale: it })}
                </h2>
                <div className="overflow-hidden rounded-md border border-border bg-card">
                  <ul className="divide-y divide-border">
                    {dayEntries.map((e) => (
                      <TimeEntryRow
                        key={e.id}
                        entry={e}
                        clients={clientPicks}
                        projects={projectPicks}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-md border border-dashed px-4 py-12 text-center font-display text-base italic text-muted-foreground">
            Nessuna voce in questa settimana.
          </p>
        )}
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
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={
          accent
            ? "mt-1.5 font-display text-3xl leading-none tabular-nums text-coral"
            : "mt-1.5 font-display text-3xl leading-none tabular-nums text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}
