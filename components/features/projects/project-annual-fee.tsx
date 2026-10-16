"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MarkFeePaidButton } from "@/components/features/payments/fee-actions";
import { setProjectAnnualFeeAction } from "@/lib/actions/project-fees";
import { feeStatus, formatEur, formatIsoDate } from "@/lib/utils/annual-fee";
import { cn } from "@/lib/utils";

export function ProjectAnnualFee({
  projectId,
  amount,
  nextDueOn,
  today,
}: {
  projectId: string;
  amount: string | null;
  nextDueOn: string | null;
  /** Oggi (YYYY-MM-DD) nella timezone dell'utente, calcolato lato server. */
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [draftAmount, setDraftAmount] = useState(amount ?? "");
  const [draftDate, setDraftDate] = useState<Date | null>(nextDueOn ? parseISO(nextDueOn) : null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasFee = amount !== null && nextDueOn !== null;
  const status = hasFee ? feeStatus(nextDueOn, today) : null;

  function save(next: { amount: string; nextDueOn: string }) {
    setError(null);
    startTransition(async () => {
      const res = await setProjectAnnualFeeAction({ projectId, ...next });
      if (res.ok) setOpen(false);
      else setError(res.error);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1 text-xs transition-colors hover:bg-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !hasFee && "text-muted-foreground",
            status === "due_soon" && "border-amber/60 text-amber",
            status === "overdue" && "border-destructive/60 text-destructive",
          )}
        >
          <Wallet className="size-3.5" />
          {hasFee ? (
            <span>
              Canone <span className="tabular-nums">{formatEur(amount)}</span>
              <span className="text-muted-foreground"> · rinnovo {formatIsoDate(nextDueOn)}</span>
            </span>
          ) : (
            "Canone annuo"
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-3 p-3">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save({
              amount: draftAmount.trim(),
              nextDueOn: draftDate ? format(draftDate, "yyyy-MM-dd") : "",
            });
          }}
        >
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">Importo annuo (€)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              disabled={pending}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </label>
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-foreground">Prossimo rinnovo</span>
            <DatePicker
              value={draftDate}
              onChange={setDraftDate}
              disabled={pending}
              allowClear={false}
              className="w-full"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            {hasFee ? (
              <Button
                type="button"
                size="sm"
                variant="subtle"
                disabled={pending}
                onClick={() => save({ amount: "", nextDueOn: "" })}
              >
                Rimuovi canone
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm" disabled={pending || !draftDate}>
              {pending ? "Salvo…" : "Salva"}
            </Button>
          </div>
        </form>
        {status && status !== "ok" && (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
            <span className={status === "overdue" ? "text-destructive" : "text-amber"}>
              {status === "overdue" ? "Rinnovo scaduto" : "Rinnovo in arrivo"}
            </span>
            <MarkFeePaidButton projectId={projectId} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
