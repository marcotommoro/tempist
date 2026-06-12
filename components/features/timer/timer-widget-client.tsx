"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  startTimerAction,
  stopTimerAction,
  updateRunningTimerAction,
} from "@/lib/actions/timer";
import { combineDateTime } from "@/lib/utils/combine-date-time";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntry } from "@/lib/db/schema";

/**
 * Timer widget client-side.
 * - Se `running` è valorizzato → mostra duration ticker + Stop button.
 *   Cliccando sull'indicatore si apre un popover per correggere ora di inizio
 *   e descrizione mentre il timer è in corso.
 * - Altrimenti → Start button.
 */
export function TimerWidgetClient({
  running,
  userTimezone,
}: {
  running: TimeEntry | null;
  userTimezone: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  function onStart() {
    setError(null);
    startTransition(async () => {
      const res = await startTimerAction({});
      if (!res.ok) setError(res.error);
    });
  }

  function onStop() {
    setError(null);
    startTransition(async () => {
      const res = await stopTimerAction();
      if (!res.ok) setError(res.error);
    });
  }

  if (running) {
    const elapsed = Math.max(
      0,
      Math.floor((now - new Date(running.startedAt).getTime()) / 1000),
    );
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-border bg-card/60 pl-1 pr-1 py-1">
        <Popover open={editOpen} onOpenChange={setEditOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Modifica timer in corso"
              className="flex items-center gap-2.5 rounded pl-1.5 pr-1 py-0.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <span
                aria-hidden
                className="inline-block size-[6px] rounded-full bg-coral animate-coral-pulse"
              />
              <span className="font-serif text-[0.6875em] italic text-muted-foreground hidden sm:inline">
                tracking
              </span>
              <span className="font-mono text-[0.8125em] tabular-nums leading-none text-foreground">
                {formatDuration(elapsed)}
              </span>
              <span className="hidden md:inline text-[0.75em] text-muted-foreground max-w-[12rem] truncate border-l border-border pl-2.5">
                {running.description ?? "Untracked"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <RunningTimerEditForm
              running={running}
              userTimezone={userTimezone}
              onDone={() => setEditOpen(false)}
            />
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={onStop}
          disabled={pending}
          aria-label="Ferma timer"
          className="inline-flex h-6 items-center gap-1 rounded bg-destructive px-2 font-mono text-[0.625em] uppercase tracking-wider text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Square className="size-3" />
          Stop
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onStart}
        disabled={pending}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-transparent pl-2 pr-2.5 text-[0.75em] text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-accent hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <Play className="size-3" />
        Start timer
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

/**
 * Form del popover: corregge ora di inizio + descrizione del timer attivo.
 * Lo stato è (ri)derivato dall'entry corrente ad ogni mount — il Popover
 * smonta il contenuto alla chiusura, quindi riapre sempre con i valori freschi.
 */
function RunningTimerEditForm({
  running,
  userTimezone,
  onDone,
}: {
  running: TimeEntry;
  userTimezone: string;
  onDone: () => void;
}) {
  const startLocal = toZonedTime(running.startedAt, userTimezone);
  const [startTime, setStartTime] = useState(() => format(startLocal, "HH:mm"));
  const [description, setDescription] = useState(running.description ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // baseDate = giorno locale dell'inizio corrente: modificando solo l'ora si
    // resta sullo stesso giorno (gestisce anche un timer a cavallo di mezzanotte).
    const startedAt = combineDateTime(startLocal, startTime, userTimezone);
    startTransition(async () => {
      const res = await updateRunningTimerAction({
        startedAt: startedAt.toISOString(),
        description: description.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="running-start-time">Ora inizio</Label>
        <Input
          id="running-start-time"
          type="time"
          step={60}
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="running-description">Descrizione</Label>
        <Input
          id="running-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Su cosa stai lavorando?"
          disabled={pending}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" className="w-full" disabled={pending}>
        Salva
      </Button>
    </form>
  );
}
