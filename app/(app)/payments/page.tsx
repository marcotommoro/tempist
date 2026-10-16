import Link from "next/link";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  listFeePayments,
  listFeeSchedule,
  type FeeScheduleItem,
} from "@/lib/domain/project-fees";
import { PageHeader } from "@/components/features/page-header/page-header";
import { EntityColorMarker } from "@/components/features/entity-color-marker";
import {
  MarkFeePaidButton,
  UndoFeePaymentButton,
} from "@/components/features/payments/fee-actions";
import { userTimezone } from "@/lib/utils/default-task-scheduled-at";
import {
  daysUntil,
  feeStatus,
  formatEur,
  formatIsoDate,
  todayIso,
} from "@/lib/utils/annual-fee";
import { cn } from "@/lib/utils";

const monthLabel = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function sum(items: { amount: string }[]): number {
  return items.reduce((acc, i) => acc + Number(i.amount), 0);
}

function relativeDue(nextDueOn: string, today: string): string {
  const d = daysUntil(nextDueOn, today);
  if (d === 0) return "scade oggi";
  if (d < 0) return d === -1 ? "scaduto ieri" : `scaduto da ${-d} giorni`;
  return d === 1 ? "scade domani" : `tra ${d} giorni`;
}

function SectionHeader({ title, total }: { title: string; total?: number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-1.5">
      <h2 className="text-[0.875em] font-medium text-foreground">{title}</h2>
      {total !== undefined && (
        <span className="font-mono text-[0.75em] tabular-nums text-muted-foreground">
          {formatEur(total)}
        </span>
      )}
    </div>
  );
}

function FeeRow({
  fee,
  today,
  action,
}: {
  fee: FeeScheduleItem;
  today: string;
  action?: React.ReactNode;
}) {
  const status = feeStatus(fee.nextDueOn, today);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <EntityColorMarker kind="project" color={fee.projectColor} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/projects/${fee.projectId}`}
          className="block truncate text-[0.875em] font-medium text-foreground underline-offset-4 hover:underline"
        >
          {fee.projectName}
        </Link>
        <div className="truncate text-[0.75em] text-muted-foreground">
          {fee.clientName ? `${fee.clientName} · ` : ""}
          {formatIsoDate(fee.nextDueOn)}
          {status !== "ok" && (
            <span className={cn(status === "overdue" ? "text-destructive" : "text-amber")}>
              {" "}
              ({relativeDue(fee.nextDueOn, today)})
            </span>
          )}
        </div>
      </div>
      <span className="font-mono text-[0.8125em] tabular-nums text-foreground">
        {formatEur(fee.amount)}
      </span>
      {action}
    </li>
  );
}

export default async function PaymentsPage() {
  const { user, organizationId } = await requireActiveOrganization();
  const today = todayIso(userTimezone(user));
  const [schedule, payments] = await Promise.all([
    listFeeSchedule({ organizationId }),
    listFeePayments({ organizationId }),
  ]);

  const toCollect = schedule.filter((f) => feeStatus(f.nextDueOn, today) !== "ok");
  const later = schedule.filter((f) => feeStatus(f.nextDueOn, today) === "ok");

  // Calendario: canoni futuri raggruppati per mese di rinnovo (già ordinati per data).
  const byMonth = new Map<string, FeeScheduleItem[]>();
  for (const f of later) {
    const key = f.nextDueOn.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), f]);
  }

  // "Annulla" solo sull'ultimo incasso di ciascun progetto (payments è già in ordine desc).
  const undoable = new Set<string>();
  const seenProjects = new Set<string>();
  for (const p of payments) {
    if (seenProjects.has(p.projectId)) continue;
    seenProjects.add(p.projectId);
    undoable.add(p.id);
  }

  const isEmpty = schedule.length === 0 && payments.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pagamenti"
        meta={
          <>
            <span>
              <span className="text-foreground tabular-nums">{schedule.length}</span>{" "}
              {schedule.length === 1 ? "canone" : "canoni"}
            </span>
            <span aria-hidden>·</span>
            <span>
              <span className="text-foreground tabular-nums">{formatEur(sum(schedule))}</span>{" "}
              l&apos;anno
            </span>
          </>
        }
        description="Canoni annui dei progetti. Il promemoria resta finché non segni il pagamento."
      />

      {isEmpty && (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-[0.875em] text-muted-foreground">
          Nessun canone ancora. Aprilo da un progetto con il pulsante{" "}
          <span className="text-foreground">Canone annuo</span>, accanto al cliente.
        </div>
      )}

      {toCollect.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Da incassare" total={sum(toCollect)} />
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
            {toCollect.map((f) => (
              <FeeRow
                key={f.projectId}
                fee={f}
                today={today}
                action={<MarkFeePaidButton projectId={f.projectId} />}
              />
            ))}
          </ul>
        </section>
      )}

      {byMonth.size > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Calendario rinnovi" />
          <div className="space-y-5">
            {[...byMonth.entries()].map(([month, fees]) => (
              <div key={month} className="space-y-2">
                <div className="flex items-baseline justify-between px-1 text-[0.75em] text-muted-foreground">
                  <span className="capitalize">{monthLabel.format(new Date(`${month}-01T00:00:00Z`))}</span>
                  <span className="font-mono tabular-nums">{formatEur(sum(fees))}</span>
                </div>
                <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
                  {fees.map((f) => (
                    <FeeRow key={f.projectId} fee={f} today={today} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {payments.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Incassati" total={sum(payments)} />
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.875em] text-foreground">{p.projectName}</div>
                  <div className="text-[0.75em] text-muted-foreground">
                    Rinnovo {formatIsoDate(p.dueOn)} · segnato il{" "}
                    {formatIsoDate(todayIso(userTimezone(user), p.paidAt))}
                  </div>
                </div>
                <span className="font-mono text-[0.8125em] tabular-nums text-billable">
                  {formatEur(p.amount)}
                </span>
                {undoable.has(p.id) && <UndoFeePaymentButton projectId={p.projectId} />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
