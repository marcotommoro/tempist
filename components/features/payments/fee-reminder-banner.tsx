import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";

import { listFeeSchedule } from "@/lib/domain/project-fees";
import { feeStatus, formatEur } from "@/lib/utils/annual-fee";
import { cn } from "@/lib/utils";

/** Promemoria canoni scaduti o in scadenza: sparisce solo quando li segni come pagati. */
export async function FeeReminderBanner({
  organizationId,
  today,
}: {
  organizationId: string;
  today: string;
}) {
  const schedule = await listFeeSchedule({ organizationId });
  const due = schedule.filter((f) => feeStatus(f.nextDueOn, today) !== "ok");
  if (due.length === 0) return null;

  const overdue = due.some((f) => feeStatus(f.nextDueOn, today) === "overdue");
  const total = due.reduce((acc, f) => acc + Number(f.amount), 0);

  return (
    <Link
      href="/payments"
      className={cn(
        "group flex items-center gap-3 rounded-md border px-4 py-3 text-[0.875em] transition-colors hover:bg-accent/40",
        overdue ? "border-destructive/40 text-destructive" : "border-amber/50 text-amber",
      )}
    >
      <Wallet className="size-4 shrink-0" />
      <span className="flex-1 text-foreground">
        {due.length === 1 ? "1 canone da incassare" : `${due.length} canoni da incassare`}
        <span className="text-muted-foreground">
          {" "}
          · <span className="tabular-nums">{formatEur(total)}</span>
          {overdue && " · alcuni sono già scaduti"}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
