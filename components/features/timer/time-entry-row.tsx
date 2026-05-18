"use client";

import { useTransition, useState } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

import { deleteTimeEntryAction } from "@/lib/actions/timer";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntry } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function TimeEntryRow({ entry }: { entry: TimeEntry }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteTimeEntryAction(entry.id);
      if (!res.ok) setError(res.error);
    });
  }

  const duration =
    entry.durationSeconds ??
    Math.max(
      0,
      Math.floor((new Date().getTime() - entry.startedAt.getTime()) / 1000),
    );

  const billableValue =
    entry.hourlyRateSnapshot && duration > 0
      ? (Number(entry.hourlyRateSnapshot) * (duration / 3600)).toFixed(2)
      : null;

  return (
    <li
      className={cn(
        "group grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-accent/40",
        pending && "opacity-50",
        entry.isRunning && "bg-sage/5",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] text-foreground">
          {entry.description ?? (
            <span className="font-display italic text-muted-foreground">
              — senza descrizione —
            </span>
          )}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {format(entry.startedAt, "EEE d LLL · HH:mm")}
          {entry.endedAt && (
            <span> → {format(entry.endedAt, "HH:mm")}</span>
          )}
          {entry.isRunning && (
            <span className="ml-2 inline-flex items-center gap-1 text-coral">
              <span
                aria-hidden
                className="inline-block size-[5px] rounded-full bg-coral animate-coral-pulse"
              />
              live
            </span>
          )}
        </p>
      </div>
      <span className="font-display text-base leading-none tabular-nums text-foreground">
        {formatDuration(duration)}
      </span>
      <span className="w-24 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
        {billableValue ? `${billableValue} ${entry.currencySnapshot}` : "—"}
      </span>
      <div className="flex items-center gap-2">
        {entry.isBillable ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-sage">
            billable
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            internal
          </span>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={pending || entry.isRunning}
          aria-label="Elimina voce"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          title={entry.isRunning ? "Ferma il timer prima di eliminare" : "Elimina"}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {error && (
        <span className="col-span-4 font-mono text-[11px] text-destructive">
          {error}
        </span>
      )}
    </li>
  );
}
