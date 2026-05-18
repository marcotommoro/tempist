"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { Check, X } from "lucide-react";

import { setTaskEstimatedMinutesAction } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
];

/**
 * Inline editable field for the task's estimated duration.
 * Accepts free text ("90", "1h", "1h30m", "1:30", "45m") + preset chips.
 */
export function TaskEstimateField({
  taskId,
  estimatedMinutes,
}: {
  taskId: string;
  estimatedMinutes: number | null;
}) {
  const [draft, setDraft] = useState<string>(
    estimatedMinutes != null ? toInputValue(estimatedMinutes) : "",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function commit(raw: string) {
    setError(null);
    const trimmed = raw.trim();
    if (trimmed === "") {
      apply(null);
      return;
    }
    const parsed = parseDurationToMinutes(trimmed);
    if (parsed == null) {
      setError("Formato non valido. Es: 90, 1h, 1h30m, 1:30");
      return;
    }
    apply(parsed);
  }

  function apply(minutes: number | null) {
    startTransition(async () => {
      const res = await setTaskEstimatedMinutesAction(taskId, minutes);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDraft(minutes != null ? toInputValue(minutes) : "");
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(draft);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setDraft(estimatedMinutes != null ? toInputValue(estimatedMinutes) : "");
      setError(null);
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={onKeyDown}
          disabled={pending}
          placeholder="es. 1h30m"
          aria-label="Stima durata"
          className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 font-mono text-[12px] tabular-nums transition-colors hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50"
        />
        {estimatedMinutes != null && (
          <button
            type="button"
            onClick={() => apply(null)}
            disabled={pending}
            aria-label="Rimuovi stima"
            title="Rimuovi"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed"
          >
            <X className="size-3.5" />
          </button>
        )}
        {pending && (
          <span className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground">
            <Check className="size-3.5 animate-pulse" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.minutes}
            type="button"
            onClick={() => apply(p.minutes)}
            disabled={pending}
            className={cn(
              "inline-flex h-6 items-center rounded border border-border bg-card/40 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed",
              estimatedMinutes === p.minutes &&
                "border-coral/30 bg-coral/10 text-coral",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="font-mono text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}

function toInputValue(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

/**
 * Parse human-friendly duration strings to minutes:
 *   "90"      -> 90
 *   "1h"      -> 60
 *   "1h30m"   -> 90
 *   "1:30"    -> 90
 *   "45m"     -> 45
 *   "2h 15"   -> 135
 */
function parseDurationToMinutes(s: string): number | null {
  const normalized = s.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) return null;

  // Bare integer = minutes
  if (/^\d+$/.test(normalized)) {
    const n = Number(normalized);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  // HH:MM
  const colon = normalized.match(/^(\d+):(\d{1,2})$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (Number.isFinite(h) && Number.isFinite(m) && m < 60) return h * 60 + m;
    return null;
  }

  // Combos like 1h30m, 1h, 30m, 2h15
  const re = /^(?:(\d+)h)?(?:(\d+)m?)?$/;
  const match = normalized.match(re);
  if (match) {
    const hours = match[1] ? Number(match[1]) : 0;
    const mins = match[2] ? Number(match[2]) : 0;
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
    const total = hours * 60 + mins;
    return total > 0 ? total : null;
  }

  return null;
}
