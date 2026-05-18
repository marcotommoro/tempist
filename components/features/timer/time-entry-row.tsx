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
    Math.max(0, Math.floor((new Date().getTime() - entry.startedAt.getTime()) / 1000));

  const billableValue =
    entry.hourlyRateSnapshot && duration > 0
      ? (Number(entry.hourlyRateSnapshot) * (duration / 3600)).toFixed(2)
      : null;

  return (
    <li
      className={cn(
        "group grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2 text-sm",
        pending && "opacity-50",
        entry.isRunning && "bg-green-50 dark:bg-green-950/30",
      )}
    >
      <div className="min-w-0">
        <p className="truncate">
          {entry.description ?? <span className="text-muted-foreground">— senza descrizione —</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(entry.startedAt, "EEE d MMM, HH:mm")}
          {entry.endedAt && ` → ${format(entry.endedAt, "HH:mm")}`}
          {entry.isRunning && " · in corso"}
        </p>
      </div>
      <span className="text-xs tabular-nums font-mono">
        {formatDuration(duration)}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">
        {billableValue ? `${billableValue} ${entry.currencySnapshot}` : "—"}
      </span>
      <div className="flex items-center gap-2">
        {entry.isBillable ? (
          <span className="text-xs text-green-600">€</span>
        ) : (
          <span className="text-xs text-muted-foreground">non bill.</span>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={pending || entry.isRunning}
          aria-label="Elimina voce"
          className="opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed text-muted-foreground hover:text-destructive"
          title={entry.isRunning ? "Ferma il timer prima di eliminare" : "Elimina"}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {error && <span className="col-span-4 text-xs text-destructive">{error}</span>}
    </li>
  );
}
