import Link from "next/link";
import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  format,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listClients } from "@/lib/domain/clients";
import { getClientAggregates } from "@/lib/domain/time-entries";
import { getCompletedTaskCountByClient } from "@/lib/domain/tasks";
import { cn } from "@/lib/utils";

type Range = "week" | "month";

type Search = { range?: string };

function computeRange(
  range: Range,
  timezone: string,
  now: Date = new Date(),
): { from: Date; to: Date; label: string } {
  const nowLocal = toZonedTime(now, timezone);
  if (range === "month") {
    const startLocal = startOfMonth(nowLocal);
    const endLocal = endOfMonth(nowLocal);
    return {
      from: fromZonedTime(startLocal, timezone),
      to: fromZonedTime(endLocal, timezone),
      label: format(nowLocal, "MMMM yyyy"),
    };
  }
  // week — settimana lun→dom
  const startLocal = startOfWeek(nowLocal, { weekStartsOn: 1 });
  const endLocal = endOfWeek(nowLocal, { weekStartsOn: 1 });
  return {
    from: fromZonedTime(startLocal, timezone),
    to: fromZonedTime(endLocal, timezone),
    label: `${format(startLocal, "d MMM")} – ${format(endLocal, "d MMM yyyy")}`,
  };
}

function hoursFromSeconds(s: number): string {
  return (s / 3600).toFixed(2);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { range: rangeParam } = await searchParams;
  const range: Range = rangeParam === "month" ? "month" : "week";

  const { user, organizationId } = await requireActiveOrganization();
  const timezone =
    (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";

  const { from, to, label } = computeRange(range, timezone);

  const [clients, aggregates, completedByClient] = await Promise.all([
    listClients({ organizationId, includeArchived: true }),
    getClientAggregates({ organizationId, from, to }),
    getCompletedTaskCountByClient({ organizationId, from, to }),
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

  // Entries senza cliente: chiave null nell'aggregate query — è gia filtrata via clientId NOT NULL
  // in getClientAggregates, ma se cambiasse, gestiamolo qui.
  // (Per ora le entries senza clientId non vengono restituite, quindi niente riga "Senza cliente".)

  // Filtra righe con tutto a zero (rumore visivo)
  const meaningful = rows.filter(
    (r) => r.totalSeconds > 0 || r.completedTasks > 0,
  );

  const totals = meaningful.reduce(
    (acc, r) => {
      acc.totalSeconds += r.totalSeconds;
      acc.entryCount += r.entryCount;
      acc.completedTasks += r.completedTasks;
      // billable: sommo per currency separatamente
      const cur = r.currency;
      acc.billableByCurrency.set(
        cur,
        (acc.billableByCurrency.get(cur) ?? 0) + r.billableAmount,
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
    <div className="space-y-6 max-w-5xl">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <RangeToggle current={range} />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </header>

      {/* Totali del range */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Ore totali" value={hoursFromSeconds(totals.totalSeconds)} />
        <Stat
          label="Voci"
          value={String(totals.entryCount)}
        />
        <Stat
          label="Task completati"
          value={String(totals.completedTasks)}
        />
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

      {/* Tabella per cliente */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Per cliente
        </h2>
        <div className="rounded-md border bg-card overflow-x-auto">
          {meaningful.length === 0 ? (
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
                {meaningful.map((r) => (
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
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.completedTasks}
                    </td>
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
