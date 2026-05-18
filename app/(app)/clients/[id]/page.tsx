import { notFound } from "next/navigation";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getClient } from "@/lib/domain/clients";
import { listTimeEntriesForClient } from "@/lib/domain/time-entries";
import { TimeEntryRow } from "@/components/features/timer/time-entry-row";
import { ManualEntryForm } from "@/components/features/timer/manual-entry-form";
import { formatDuration } from "@/lib/utils/format-duration";

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

  const entries = await listTimeEntriesForClient({
    clientId: id,
    organizationId,
    limit: 100,
  });

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
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: client.color }}
            aria-hidden
          />
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {client.email && <span>📧 {client.email}</span>}
          {client.vatNumber && <span>P.IVA {client.vatNumber}</span>}
          {client.hourlyRateDefault && (
            <span>
              💶 {client.hourlyRateDefault} {client.currency}/h
            </span>
          )}
        </div>
      </header>

      {/* Totali */}
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Ore totali" value={formatDuration(totals.totalSeconds)} />
        <Stat
          label="Fatturabile"
          value={`${totals.billable.toFixed(2)} ${client.currency}`}
        />
        <Stat label="Voci" value={String(entries.length)} />
      </section>

      <ManualEntryForm clientId={id} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Time entries
        </h2>
        <div className="rounded-md border bg-card">
          {entries.length > 0 ? (
            <ul className="divide-y divide-border">
              {entries.map((e) => (
                <TimeEntryRow key={e.id} entry={e} />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nessuna voce di tracking ancora.
            </p>
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
