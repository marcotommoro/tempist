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
 *
 * Real-time cross-device sync: rimandato a Fase 4.
 * Per ora ogni tab calcola il proprio elapsed dal `startedAt` del DB.
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
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 rounded-full bg-red-500 animate-pulse"
        />
        <span className="text-sm font-mono tabular-nums">
          {formatDuration(elapsed)}
        </span>
        <span className="text-xs text-muted-foreground max-w-[14rem] truncate">
          {running.description ?? "Untracked"}
        </span>
        <button
          type="button"
          onClick={onStop}
          disabled={pending}
          aria-label="Ferma timer"
          className="inline-flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
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
        className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        <Play className="size-3" />
        Start timer
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
