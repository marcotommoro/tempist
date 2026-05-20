"use client";

import { useState, useTransition, type FormEvent } from "react";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTimeEntryAction } from "@/lib/actions/timer";
import type { Client, Project, TimeEntry } from "@/lib/db/schema";

type ClientPick = Pick<Client, "id" | "name">;
type ProjectPick = Pick<Project, "id" | "name" | "clientId">;

/**
 * Compone una data calendariale (Date) + un time string "HH:mm" in un istante UTC,
 * interpretando il tempo nel fuso dell'utente (non in quello del browser).
 *
 * Senza la conversione esplicita via fromZonedTime, `new Date('YYYY-MM-DDTHH:mm:00')`
 * userebbe il fuso locale del browser → bug quando l'utente è in viaggio.
 */
function combineDateTime(dateLocal: Date, timeStr: string, tz: string): Date {
  const dateStr = format(dateLocal, "yyyy-MM-dd");
  return fromZonedTime(`${dateStr}T${timeStr}:00`, tz);
}

function TimeEntryEditForm({
  entry,
  clients,
  projects,
  userTimezone,
  onClose,
}: {
  entry: TimeEntry;
  clients: ClientPick[];
  projects: ProjectPick[];
  userTimezone: string;
  onClose: () => void;
}) {
  // Converte gli istanti UTC dell'entry nel fuso dell'utente per popolare i form,
  // così quello che l'utente vede combacia col fuso del suo profilo.
  const startLocal = toZonedTime(entry.startedAt, userTimezone);
  const endLocal = toZonedTime(
    entry.endedAt ?? entry.startedAt,
    userTimezone,
  );
  const [date, setDate] = useState(startLocal);
  const [startTime, setStartTime] = useState(format(startLocal, "HH:mm"));
  const [endTime, setEndTime] = useState(format(endLocal, "HH:mm"));
  const [description, setDescription] = useState(entry.description ?? "");
  const [clientId, setClientId] = useState(entry.clientId ?? "");
  const [projectId, setProjectId] = useState(entry.projectId ?? "");
  const [billable, setBillable] = useState(entry.isBillable);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onProjectChange(next: string) {
    setProjectId(next);
    if (next) {
      const p = projects.find((x) => x.id === next);
      if (p?.clientId && !clientId) setClientId(p.clientId);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const startedAt = combineDateTime(date, startTime, userTimezone);
    const endedAt = combineDateTime(date, endTime, userTimezone);
    if (endedAt.getTime() <= startedAt.getTime()) {
      setError("Ora fine deve essere dopo ora inizio");
      return;
    }
    startTransition(async () => {
      const res = await updateTimeEntryAction({
        timeEntryId: entry.id,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        description: description.trim() || undefined,
        clientId: clientId || null,
        projectId: projectId || null,
        taskId: entry.taskId,
        isBillable: billable,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Giorno</Label>
        <DatePicker
          value={date}
          onChange={(d) => d && setDate(d)}
          disabled={pending || entry.isRunning}
          allowClear={false}
          className="w-full"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="edit-start">Ora inizio</Label>
          <Input
            id="edit-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            step={60}
            required
            disabled={pending || entry.isRunning}
          />
        </div>
        <div>
          <Label htmlFor="edit-end">Ora fine</Label>
          <Input
            id="edit-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            step={60}
            required
            disabled={pending || entry.isRunning}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="edit-project">Progetto</Label>
          <select
            id="edit-project"
            value={projectId}
            onChange={(e) => onProjectChange(e.target.value)}
            disabled={pending || entry.isRunning}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
          >
            <option value="">— nessuno —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="edit-client">Cliente</Label>
          <select
            id="edit-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={pending || entry.isRunning}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
          >
            <option value="">— nessuno —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="edit-desc">Descrizione</Label>
        <Input
          id="edit-desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Cosa hai fatto?"
          maxLength={500}
          disabled={pending || entry.isRunning}
        />
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={billable}
          onChange={(e) => setBillable(e.target.checked)}
          disabled={pending || entry.isRunning}
          className="accent-primary"
        />
        <span>Fatturabile</span>
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          Annulla
        </Button>
        <Button type="submit" disabled={pending || entry.isRunning}>
          {pending ? "Salvataggio…" : "Salva modifiche"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TimeEntryEditDialog({
  entry,
  clients,
  projects,
  userTimezone,
  open,
  onOpenChange,
}: {
  entry: TimeEntry;
  clients: ClientPick[];
  projects: ProjectPick[];
  userTimezone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" />
            Modifica voce
          </DialogTitle>
          <DialogDescription>
            Aggiorna date, cliente, progetto e descrizione. La tariffa congelata non cambia.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <TimeEntryEditForm
            key={entry.id}
            entry={entry}
            clients={clients}
            projects={projects}
            userTimezone={userTimezone}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
