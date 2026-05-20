import { notFound } from "next/navigation";
import { Mail, Pencil, Receipt } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getClient, listClients } from "@/lib/domain/clients";
import { listProjects } from "@/lib/domain/projects";
import {
  getTrackedSecondsByTask,
  listTimeEntriesForClient,
} from "@/lib/domain/time-entries";
import { getTasksForClient } from "@/lib/domain/tasks";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { EditClientDialog } from "@/components/features/clients/edit-client-dialog";
import { TimeEntryRow } from "@/components/features/timer/time-entry-row";
import { ManualEntryForm } from "@/components/features/timer/manual-entry-form";
import { TaskList } from "@/components/features/tasks/task-list";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils/format-duration";
import { PageHeader } from "@/components/features/page-header/page-header";

type Params = { id: string };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const { organizationId } = await requireActiveOrganization();
  const client = await getClient({ clientId: id, organizationId });
  if (!client) notFound();

  const [entries, clients, projects] = await Promise.all([
    listTimeEntriesForClient({
      clientId: id,
      organizationId,
      limit: 100,
    }),
    listClients({ organizationId }),
    listProjects({ organizationId }),
  ]);

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

  // Totali per il cliente
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/10"
              style={{ backgroundColor: client.color }}
              aria-hidden
            />
            Client
          </span>
        }
        title={client.name}
        actions={
          <EditClientDialog
            client={client}
            trigger={
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <Pencil className="size-3.5" />
                Modifica
              </Button>
            }
          />
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

      {/* Totali — editorial KPI grid */}
      <section className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border">
        <Stat label="Hours" value={formatDuration(totals.totalSeconds)} />
        <Stat
          label={`Billable (${client.currency})`}
          value={totals.billable.toFixed(2)}
          accent
        />
        <Stat label="Entries" value={String(entries.length)} />
      </section>

      <ManualEntryForm clientId={id} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-border pb-1.5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Tasks
          </h2>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {String(tasks.length).padStart(2, "0")}
          </span>
        </div>
        <TaskList
          tasks={tasks}
          trackedByTask={trackedByTask}
          remindersByTask={remindersByTask}
          emptyMessage="Nessun task legato a questo cliente."
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-border pb-1.5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Time entries
          </h2>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
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
                />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center font-display text-base italic text-muted-foreground">
              Nessuna voce di tracking ancora.
            </p>
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
