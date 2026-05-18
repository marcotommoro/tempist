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

  function presetToday() {
    const d = new Date();
    const [h, m] = TODAY_DEFAULT_TIME.split(":");
    d.setHours(Number(h), Number(m), 0, 0);
    applyDate(d);
  }
  function presetTomorrow() {
    const d = addDays(new Date(), 1);
    const [h, m] = TODAY_DEFAULT_TIME.split(":");
    d.setHours(Number(h), Number(m), 0, 0);
    applyDate(d);
  }
  function presetNextMonday() {
    const d = nextMonday(new Date());
    const [h, m] = TODAY_DEFAULT_TIME.split(":");
    d.setHours(Number(h), Number(m), 0, 0);
    applyDate(d);
  }
  function presetNextWeek() {
    const d = addWeeks(new Date(), 1);
    const [h, m] = TODAY_DEFAULT_TIME.split(":");
    d.setHours(Number(h), Number(m), 0, 0);
    applyDate(d);
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
          aria-label={hasDate ? `Pianificato per ${format(currentScheduledAt!, "d MMM HH:mm")}` : "Pianifica task"}
          title="Pianifica"
          className={cn(
            "text-muted-foreground hover:text-foreground disabled:cursor-not-allowed",
            hasDate && "text-blue-600 dark:text-blue-400",
          )}
        >
          <CalendarIcon className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
            Pianifica per
          </div>
          <PresetButton onClick={presetToday} disabled={pending}>
            Oggi
            <span className="ml-auto text-xs text-muted-foreground">
              {format(new Date(), "EEE d MMM")}
            </span>
          </PresetButton>
          <PresetButton onClick={presetTomorrow} disabled={pending}>
            Domani
            <span className="ml-auto text-xs text-muted-foreground">
              {format(addDays(new Date(), 1), "EEE d MMM")}
            </span>
          </PresetButton>
          <PresetButton onClick={presetNextMonday} disabled={pending}>
            Prossimo lunedì
            <span className="ml-auto text-xs text-muted-foreground">
              {format(nextMonday(new Date()), "d MMM")}
            </span>
          </PresetButton>
          <PresetButton onClick={presetNextWeek} disabled={pending}>
            +1 settimana
            <span className="ml-auto text-xs text-muted-foreground">
              {format(addWeeks(new Date(), 1), "EEE d MMM")}
            </span>
          </PresetButton>
        </div>
        <div className="border-t my-2" />
        <div className="space-y-1 px-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
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
            <div className="border-t my-2" />
            <button
              type="button"
              onClick={clear}
              disabled={pending}
              className="w-full inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed"
            >
              <X className="size-3.5" /> Rimuovi data
            </button>
          </>
        )}
        {error && <p className="px-2 pt-2 text-xs text-destructive">{error}</p>}
      </PopoverContent>
    </Popover>
  );
}

function PresetButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs text-left hover:bg-muted disabled:cursor-not-allowed"
    >
      <CalendarIcon className="size-3.5 text-muted-foreground" />
      {children}
    </button>
  );
}
