"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";

import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { createManualEntryAction } from "@/lib/actions/timer";
import { cn } from "@/lib/utils";

function parseHours(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const colon = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (m >= 60) return null;
    return h + m / 60;
  }
  const hm = trimmed.match(/^(\d+)\s*h\s*(\d+)\s*m?$/);
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (m >= 60) return null;
    return h + m / 60;
  }
  const onlyH = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*h?$/);
  if (onlyH && onlyH[1] != null) {
    return Number(onlyH[1].replace(",", "."));
  }
  return null;
}

export function TaskManualTimeForm({
  taskId,
  projectId,
  clientId,
  onAdded,
}: {
  taskId: string;
  projectId: string | null;
  clientId: string | null;
  onAdded?: () => void;
}) {
  const [date, setDate] = useState<Date>(() => new Date());
  const [hours, setHours] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const parsed = parseHours(hours);
    if (parsed == null || parsed <= 0) {
      setError("Formato: 2.5 · 2:30 · 1h30");
      return;
    }
    if (parsed > 24) {
      setError("Max 24h");
      return;
    }
    const dateStr = format(date, "yyyy-MM-dd");
    const startedAt = new Date(`${dateStr}T09:00:00`);
    const durationMs = Math.round(parsed * 3600) * 1000;
    const endedAt = new Date(startedAt.getTime() + durationMs);

    startTransition(async () => {
      const res = await createManualEntryAction({
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        taskId,
        projectId,
        clientId,
        isBillable: true,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setHours("");
      onAdded?.();
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/20 p-3">
      <p className="font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
        Aggiungi tempo
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[9rem] flex-1">
          <DatePicker
            value={date}
            onChange={(d) => d && setDate(d)}
            disabled={pending}
            allowClear={false}
            className="w-full"
          />
        </div>
        <div className="min-w-[5rem] flex-1">
          <input
            type="text"
            inputMode="decimal"
            value={hours}
            onChange={(e) => {
              setHours(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ore (es. 1h30)"
            disabled={pending}
            className={cn(
              "h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm tabular-nums",
              error && "border-destructive/60",
            )}
            aria-label="Ore"
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={pending || !hours.trim()}
          className="shrink-0"
        >
          <Plus className="size-3.5" />
          {pending ? "Salvataggio…" : "Aggiungi"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
