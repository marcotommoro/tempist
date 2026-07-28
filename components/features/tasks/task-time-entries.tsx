"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchTaskTimeEntriesAction } from "@/lib/actions/timer";
import type { TimeEntry } from "@/lib/db/schema";
import { formatDuration } from "@/lib/utils/format-duration";
import { TimeEntryRow } from "@/components/features/timer/time-entry-row";

// Il file dell'action è "use server": può esportare solo funzioni async,
// quindi la forma del payload si ridichiara qui.
type Data = {
  entries: TimeEntry[];
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; clientId: string | null }>;
  userTimezone: string;
};

/**
 * Elenco del tempo segnato su un task, con modifica/eliminazione per voce
 * (riusa TimeEntryRow del timesheet). Carica solo a dialog aperto.
 */
export function TaskTimeEntries({
  taskId,
  open,
}: {
  taskId: string;
  open: boolean;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    fetchTaskTimeEntriesAction(taskId).then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  useEffect(() => {
    if (!open) return;
    return load();
  }, [open, load]);

  const entries: TimeEntry[] = data?.entries ?? [];
  const total = entries.reduce((sum, e) => sum + (e.durationSeconds ?? 0), 0);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
          Tempo segnato
        </h3>
        {total > 0 && (
          <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
            {formatDuration(total)}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {open && !data && !error ? (
        <p className="font-serif text-sm italic text-muted-foreground">
          Caricamento tempi...
        </p>
      ) : entries.length === 0 ? (
        <p className="font-serif text-sm italic text-muted-foreground">
          Nessun tempo segnato.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {entries.map((entry) => (
            <TimeEntryRow
              key={entry.id}
              entry={entry}
              clients={data?.clients ?? []}
              projects={data?.projects ?? []}
              userTimezone={data?.userTimezone ?? "Europe/Rome"}
              onChanged={load}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
