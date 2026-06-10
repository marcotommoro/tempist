"use client";

import { useState, useTransition } from "react";
import { addDays, addWeeks, format, nextMonday } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { setTaskScheduledAtAction } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";

const TODAY_DEFAULT_TIME = "09:00";

export function TaskSchedulePicker({
  taskId,
  currentScheduledAt,
}: {
  taskId: string;
  currentScheduledAt: Date | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function applyDate(d: Date | null) {
    setError(null);
    startTransition(async () => {
      const res = await setTaskScheduledAtAction(
        taskId,
        d ? d.toISOString() : null,
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
    });
  }

  function withDefaultTime(d: Date) {
    const [h, m] = TODAY_DEFAULT_TIME.split(":");
    d.setHours(Number(h), Number(m), 0, 0);
    return d;
  }

  function presetToday() {
    applyDate(withDefaultTime(new Date()));
  }
  function presetTomorrow() {
    applyDate(withDefaultTime(addDays(new Date(), 1)));
  }
  function presetNextMonday() {
    applyDate(withDefaultTime(nextMonday(new Date())));
  }
  function presetNextWeek() {
    applyDate(withDefaultTime(addWeeks(new Date(), 1)));
  }
  function applyCustom(d: Date | null) {
    applyDate(d);
  }
  function clear() {
    applyDate(null);
  }

  const hasDate = currentScheduledAt != null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            hasDate
              ? `Pianificato per ${format(currentScheduledAt!, "d MMM HH:mm")}`
              : "Pianifica task"
          }
          title="Pianifica"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-coral/10 hover:text-coral disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            hasDate && "text-coral",
          )}
        >
          <CalendarIcon className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-w-[calc(100vw-1rem)] p-2">
        <div className="space-y-0.5">
          <div className="px-2 py-1 font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
            Pianifica per
          </div>
          <PresetButton onClick={presetToday} disabled={pending} label="Oggi">
            {format(new Date(), "EEE d LLL")}
          </PresetButton>
          <PresetButton onClick={presetTomorrow} disabled={pending} label="Domani">
            {format(addDays(new Date(), 1), "EEE d LLL")}
          </PresetButton>
          <PresetButton
            onClick={presetNextMonday}
            disabled={pending}
            label="Prossimo lunedì"
          >
            {format(nextMonday(new Date()), "d LLL")}
          </PresetButton>
          <PresetButton
            onClick={presetNextWeek}
            disabled={pending}
            label="+1 settimana"
          >
            {format(addWeeks(new Date(), 1), "EEE d LLL")}
          </PresetButton>
        </div>
        <div className="my-2 border-t border-border" />
        <div className="space-y-1.5 px-1">
          <div className="px-1 font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
            Data/ora specifica
          </div>
          <DateTimePicker
            value={currentScheduledAt}
            onChange={applyCustom}
            disabled={pending}
            placeholder="Scegli data e ora"
            allowClear={false}
            className="w-full"
          />
        </div>
        {hasDate && (
          <>
            <div className="my-2 border-t border-border" />
            <button
              type="button"
              onClick={clear}
              disabled={pending}
              className="inline-flex w-full items-center gap-2 rounded px-2 py-1.5 text-[0.75em] text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed"
            >
              <X className="size-3.5" /> Rimuovi data
            </button>
          </>
        )}
        {error && (
          <p className="px-2 pt-2 font-mono text-[0.6875em] text-destructive">
            {error}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PresetButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[0.8125em] transition-colors hover:bg-accent disabled:cursor-not-allowed"
    >
      <CalendarIcon className="size-3.5 text-muted-foreground" />
      <span>{label}</span>
      <span className="ml-auto font-mono text-[0.625em] tabular-nums text-muted-foreground">
        {children}
      </span>
    </button>
  );
}
