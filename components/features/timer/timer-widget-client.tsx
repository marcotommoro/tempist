"use client";

import { useEffect, useState, useTransition } from "react";
import { Play, Square } from "lucide-react";

import { startTimerAction, stopTimerAction } from "@/lib/actions/timer";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntry } from "@/lib/db/schema";

/**
 * Timer widget client-side.
 * - Se `running` è valorizzato → mostra duration ticker + Stop button
 * - Altrimenti → Start button
 */
export function TimerWidgetClient({ running }: { running: TimeEntry | null }) {
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex items-center gap-2.5 rounded-md border border-border bg-card/60 pl-2.5 pr-1 py-1">
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
