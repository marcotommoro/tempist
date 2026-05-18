"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Clock, Plus } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createManualEntryAction } from "@/lib/actions/timer";
import type { Client, Project } from "@/lib/db/schema";

/**
 * Inserimento manuale ore globale (button in topbar).
 *
 * Format UX:
 *   - data (un solo giorno, default oggi)
 *   - ora inizio (HH:MM)
 *   - ora fine (HH:MM)
 *   - cliente (opzionale)
 *   - progetto (opzionale)
 *   - descrizione (opzionale)
 *
 * Sotto il cofano compone startedAt/endedAt come ISO e chiama createManualEntryAction.
 */
export function GlobalManualEntryDialog({
  clients,
  projects,
}: {
  clients: Pick<Client, "id" | "name" | "color">[];
  projects: Pick<Project, "id" | "name" | "color" | "clientId">[];
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [date, setDate] = useState<Date>(today);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function combineDateTime(d: Date, timeStr: string): Date {
    const dateStr = format(d, "yyyy-MM-dd");
    // datetime locale: il browser interpreta in tz utente
    return new Date(`${dateStr}T${timeStr}:00`);
  }

  function reset() {
    setDescription("");
    setError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const startedAt = combineDateTime(date, startTime);
    const endedAt = combineDateTime(date, endTime);
    if (endedAt.getTime() <= startedAt.getTime()) {
      setError("Ora fine deve essere dopo ora inizio");
      return;
    }
    startTransition(async () => {
      const res = await createManualEntryAction({
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        description: description.trim() || undefined,
        clientId: clientId || null,
        projectId: projectId || null,
        isBillable: billable,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
    });
  }

  // Quando seleziono un progetto, propaga il suo client (se ce l'ha)
  function onProjectChange(next: string) {
    setProjectId(next);
    if (next) {
      const p = projects.find((x) => x.id === next);
      if (p?.clientId && !clientId) setClientId(p.clientId);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) reset();
    }}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Inserisci ore lavorate manualmente"
          className="h-8 gap-1.5 text-xs"
        >
          <Clock className="size-3.5" />
          Inserisci ore
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inserisci ore lavorate</DialogTitle>
          <DialogDescription>
            Registra retroattivamente un blocco di tempo già lavorato.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="manual-date">Giorno</Label>
            <DatePicker
              value={date}
              onChange={(d) => d && setDate(d)}
              disabled={pending}
              allowClear={false}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="manual-start">Ora inizio</Label>
              <Input
                id="manual-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                step={60}
                required
                disabled={pending}
              />
            </div>
            <div>
              <Label htmlFor="manual-end">Ora fine</Label>
              <Input
                id="manual-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                step={60}
                required
                disabled={pending}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="manual-project">Progetto</Label>
              <select
                id="manual-project"
                value={projectId}
                onChange={(e) => onProjectChange(e.target.value)}
                disabled={pending}
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
              <Label htmlFor="manual-client">Cliente</Label>
              <select
                id="manual-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={pending}
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
            <Label htmlFor="manual-desc">Descrizione (opzionale)</Label>
            <Input
              id="manual-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cosa hai fatto?"
              maxLength={500}
              disabled={pending}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              disabled={pending}
              className="accent-primary"
            />
            <span>Fatturabile</span>
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              <Plus className="size-4 mr-1" />
              {pending ? "Salvataggio…" : "Salva voce"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
