import { format } from "date-fns";
import { it } from "date-fns/locale";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listClients } from "@/lib/domain/clients";
import { listProjects } from "@/lib/domain/projects";
import { listTimeEntriesForUser } from "@/lib/domain/time-entries";
import { TimesheetFilters } from "@/components/features/timer/timesheet-filters";
import { TimeEntryRow } from "@/components/features/timer/time-entry-row";
import { ManualEntryForm } from "@/components/features/timer/manual-entry-form";
import { PageHeader } from "@/components/features/page-header/page-header";
import { formatDuration } from "@/lib/utils/format-duration";
import { userTimezone } from "@/lib/utils/default-task-scheduled-at";
import {
  formatWeekLabel,
  resolveTimesheetRange,
} from "@/lib/utils/timesheet-week";
import type { TimeEntry } from "@/lib/db/schema";

type Search = {
  from?: string;
  to?: string;
  clientId?: string;
  projectId?: string;
};

type DayBucket = {
  entries: TimeEntry[];
  totalSeconds: number;
  billableAmount: number;
};

function groupByDay(entries: TimeEntry[]): Map<string, DayBucket> {
  const groups = new Map<string, DayBucket>();
  for (const e of entries) {
    const key = format(e.startedAt, "yyyy-MM-dd");
    const bucket = groups.get(key) ?? {
      entries: [],
      totalSeconds: 0,
      billableAmount: 0,
    };
    bucket.entries.push(e);
    const dur = e.durationSeconds ?? 0;
    bucket.totalSeconds += dur;
    if (e.isBillable && e.hourlyRateSnapshot) {
      bucket.billableAmount += Number(e.hourlyRateSnapshot) * (dur / 3600);
    }
    groups.set(key, bucket);
  }
  return groups;
}

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const {
    from: fromParam,
    to: toParam,
    clientId,
    projectId,
  } = await searchParams;
  const { user, organizationId } = await requireActiveOrganization();
  const tz = userTimezone(user as { timezone?: string | null });

  const { from, to, isCustom } = resolveTimesheetRange(fromParam, toParam);
  const weekLabel = formatWeekLabel(from, to);

  const [entries, clients, projects] = await Promise.all([
    listTimeEntriesForUser({
      userId: user.id,
      organizationId,
      from,
      to,
      clientId: clientId || undefined,
      projectId: projectId || undefined,
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
            projects={projectPicks}
            clientId={clientId}
            projectId={projectId}
            isCustomRange={isCustom}
          />
        }
      />

      <ManualEntryForm />

      <section className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border">
        <Stat label="Hours" value={formatDuration(totals.totalSeconds)} />
        <Stat label="Billable" value={totals.billable.toFixed(2)} accent />
        <Stat label="Entries" value={String(entries.length)} />
      </section>

      <section className="space-y-6">
        {dayKeys.length > 0 ? (
          dayKeys.map((dayKey) => {
            const bucket = byDay.get(dayKey)!;
            const dayDate = bucket.entries[0]!.startedAt;
            return (
              <div key={dayKey} className="space-y-2">
                <div className="flex items-baseline justify-between border-b border-border pb-1">
                  <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
                    {format(dayDate, "EEEE d MMMM yyyy", { locale: it })}
                  </h2>
                  <span className="font-mono text-[0.625rem] tabular-nums text-muted-foreground">
                    {formatDuration(bucket.totalSeconds)}
                    {bucket.billableAmount > 0 && (
                      <span className="ml-2 text-coral">
                        · {bucket.billableAmount.toFixed(2)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="overflow-hidden rounded-md border border-border bg-card">
                  <ul className="divide-y divide-border">
                    {bucket.entries.map((e) => (
                      <TimeEntryRow
                        key={e.id}
                        entry={e}
                        clients={clientPicks}
                        projects={projectPicks}
                        userTimezone={tz}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed px-4 py-12 text-center">
            <p className="font-display text-base italic text-muted-foreground">
              Nessuna voce in questo periodo.
            </p>
            <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
              Avvia un timer dalla command palette o aggiungi una voce manuale qui sopra.
            </p>
          </div>
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
      <div className="text-eyebrow">
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
