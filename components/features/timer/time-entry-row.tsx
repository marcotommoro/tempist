"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteTimeEntryAction } from "@/lib/actions/timer";
import type { Client, Project, TimeEntry } from "@/lib/db/schema";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import { TimeEntryEditDialog } from "./time-entry-edit-dialog";

type ClientPick = Pick<Client, "id" | "name">;
type ProjectPick = Pick<Project, "id" | "name" | "clientId">;

export function TimeEntryRow({
  entry,
  clients = [],
  projects = [],
  userTimezone = "Europe/Rome",
}: {
  entry: TimeEntry;
  clients?: ClientPick[];
  projects?: ProjectPick[];
  userTimezone?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Tick locale: solo per la voce in corso, così la durata "scorre" come in header.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!entry.isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [entry.isRunning]);

  const clientName = useMemo(
    () => clients.find((c) => c.id === entry.clientId)?.name,
    [clients, entry.clientId],
  );
  const projectName = useMemo(
    () => projects.find((p) => p.id === entry.projectId)?.name,
    [projects, entry.projectId],
  );

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteTimeEntryAction(entry.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirmDelete(false);
    });
  }

  const duration =
    entry.durationSeconds ??
    Math.max(0, Math.floor((now - entry.startedAt.getTime()) / 1000));

  const billableValue =
    entry.hourlyRateSnapshot && duration > 0
      ? (Number(entry.hourlyRateSnapshot) * (duration / 3600)).toFixed(2)
      : null;

  const canMutate = !entry.isRunning;

  return (
    <>
      <li
        className={cn(
          "group grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-accent/40",
          pending && "opacity-50",
          entry.isRunning && "bg-sage/5",
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-[0.8125em] text-foreground">
            {entry.description ?? (
              <span className="font-serif italic text-muted-foreground">
                — senza descrizione —
              </span>
            )}
          </p>
          <p className="mt-0.5 font-mono text-[0.625em] uppercase tracking-[0.12em] text-muted-foreground">
            {format(entry.startedAt, "EEE d LLL · HH:mm", { locale: it })}
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
          {(clientName || projectName) && (
            <p className="mt-0.5 truncate text-[0.6875em] text-muted-foreground">
              {[clientName, projectName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <span className="font-display text-base leading-none tabular-nums text-foreground">
          {formatDuration(duration)}
        </span>
        <span className="w-24 text-right font-mono text-[0.75em] tabular-nums text-muted-foreground">
          {billableValue ? `${billableValue} ${entry.currencySnapshot}` : "—"}
        </span>
        <div className="flex items-center gap-1">
          {entry.isBillable ? (
            <span className="font-mono text-[0.625em] uppercase tracking-wider text-sage">
              billable
            </span>
          ) : (
            <span className="font-mono text-[0.625em] uppercase tracking-wider text-muted-foreground">
              internal
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={pending || !canMutate}
            aria-label="Modifica voce"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-foreground disabled:cursor-not-allowed group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            title={canMutate ? "Modifica" : "Ferma il timer prima di modificare"}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={pending || !canMutate}
            aria-label="Elimina voce"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            title={canMutate ? "Elimina" : "Ferma il timer prima di eliminare"}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
        {error && (
          <span className="col-span-4 font-mono text-[0.6875em] text-destructive">
            {error}
          </span>
        )}
      </li>

      {clients.length > 0 && (
        <TimeEntryEditDialog
          entry={entry}
          clients={clients}
          projects={projects}
          userTimezone={userTimezone}
          open={editing}
          onOpenChange={setEditing}
        />
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Elimina voce
            </DialogTitle>
            <DialogDescription>
              La voce verrà eliminata definitivamente. Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={pending}
            >
              {pending ? "Eliminazione…" : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
