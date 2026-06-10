"use client";

import {
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Clock, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { minutesToTimeString } from "@/lib/utils/linked-time-range";

import { LinkedTimeRangeFields } from "./linked-time-range-fields";
import { useLinkedTimeRange } from "./use-linked-time-range";

/**
 * Inserimento manuale ore globale (button in topbar).
 *
 * Format UX:
 *   - data (un solo giorno, default oggi)
 *   - ora inizio (HH:MM)
 *   - ora fine (HH:MM)
 *   - ore effettive (es. 1h30m) — l'ultimo campo modificato aggiorna gli altri due
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
  // Default 1h esplicito: per una NUOVA voce il default vive qui, non più
  // nascosto come fallback nel hook.
  const timeRange = useLinkedTimeRange("09:00", "10:00", 3600);
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

  // keepOpen=false → salva e chiude (Invio). keepOpen=true → "salva e continua"
  // (⌘/Ctrl+Invio): la voce successiva parte dalla fine di questa con la stessa
  // durata, mantenendo giorno/progetto/cliente e svuotando la descrizione.
  function submitEntry(keepOpen: boolean) {
    setError(null);
    const range = timeRange.getResolvedRange();
    if (!range.ok) {
      setError(range.error);
      return;
    }
    const startedAt = combineDateTime(date, timeRange.startTime);
    const endedAt = combineDateTime(date, timeRange.endTime);
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
      if (keepOpen) {
        timeRange.reset(
          minutesToTimeString(range.endMinutes),
          minutesToTimeString(range.endMinutes + range.durationMinutes),
        );
        setDescription("");
        return;
      }
      reset();
      setOpen(false);
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submitEntry(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submitEntry(true);
    }
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
        <form onSubmit={onSubmit} onKeyDown={onKeyDown} className="space-y-3">
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
          <LinkedTimeRangeFields
            startId="manual-start"
            endId="manual-end"
            durationId="manual-duration"
            startTime={timeRange.startTime}
            endTime={timeRange.endTime}
            durationText={timeRange.durationText}
            onStartChange={timeRange.onStartChange}
            onEndChange={timeRange.onEndChange}
            onDurationChange={timeRange.onDurationChange}
            onDurationBlur={timeRange.onDurationBlur}
            disabled={pending}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="manual-project">Progetto</Label>
              <div className="relative">
                <select
                  id="manual-project"
                  value={projectId}
                  onChange={(e) => onProjectChange(e.target.value)}
                  disabled={pending}
                  className="w-full h-10 appearance-none rounded-md border border-input bg-background pl-3 pr-9 text-sm disabled:opacity-50"
                >
                  <option value="">— nessuno —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div>
              <Label htmlFor="manual-client">Cliente</Label>
              <div className="relative">
                <select
                  id="manual-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={pending}
                  className="w-full h-10 appearance-none rounded-md border border-input bg-background pl-3 pr-9 text-sm disabled:opacity-50"
                >
                  <option value="">— nessuno —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
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
          <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm">
            <span className="relative inline-flex">
              {/* L'input resta il vero box cliccabile; lo stato visivo è guidato
                  da `billable` con utility base, così non dipende dai varianti
                  checked:/peer-checked: di Tailwind. */}
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                disabled={pending}
                className={cn(
                  "size-4 appearance-none rounded-[5px] border transition-colors disabled:opacity-50",
                  billable
                    ? "border-coral bg-coral"
                    : "border-input bg-background",
                )}
              />
              {billable && (
                <Check
                  strokeWidth={3}
                  className="pointer-events-none absolute inset-0 m-auto size-3 text-coral-foreground"
                />
              )}
            </span>
            <span>Fatturabile</span>
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <span className="hidden text-xs text-muted-foreground sm:mr-auto sm:flex sm:items-center">
              {"⌘↵ salva e aggiungine un'altra"}
            </span>
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
