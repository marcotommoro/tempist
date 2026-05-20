"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: Date | null;
  onChange: (d: Date | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
  defaultHour?: number;
  defaultMinute?: number;
  /** Step minute granularity for the minute select. Default 5. */
  minuteStep?: number;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Seleziona data e ora",
  allowClear = true,
  align = "start",
  className,
  defaultHour = 9,
  defaultMinute = 0,
  minuteStep = 5,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState<number>(value ? value.getHours() : defaultHour);
  const [minute, setMinute] = useState<number>(
    value ? value.getMinutes() : defaultMinute,
  );

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(
    () =>
      Array.from(
        { length: Math.ceil(60 / minuteStep) },
        (_, i) => i * minuteStep,
      ),
    [minuteStep],
  );

  function applyDate(d: Date | undefined) {
    if (!d) return;
    const next = new Date(d);
    next.setHours(hour, minute, 0, 0);
    onChange(next);
  }

  function applyTime(h: number, m: number) {
    setHour(h);
    setMinute(m);
    if (!value) return;
    const next = new Date(value);
    next.setHours(h, m, 0, 0);
    onChange(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm transition-colors",
            "hover:border-foreground/20 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {value ? format(value, "EEE d MMM · HH:mm") : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={applyDate}
          autoFocus
        />
        <div className="mt-2 border-t border-border px-1 pt-2">
          <div className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground">
            Time
          </div>
          <div className="flex items-center gap-2">
            <TimeSelect
              value={hour}
              options={hours}
              onChange={(h) => applyTime(h, minute)}
              aria-label="Ora"
            />
            <span className="font-display text-lg leading-none text-muted-foreground">
              :
            </span>
            <TimeSelect
              value={minute}
              options={minutes}
              onChange={(m) => applyTime(hour, m)}
              aria-label="Minuti"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto inline-flex h-8 items-center rounded bg-foreground px-3 font-mono text-[0.625rem] uppercase tracking-wider text-background transition-opacity hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
        {allowClear && value && (
          <div className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[0.75rem] text-destructive transition-colors hover:bg-destructive/10"
            >
              <X className="size-3.5" /> Rimuovi data
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TimeSelect({
  value,
  options,
  onChange,
  ...props
}: {
  value: number;
  options: number[];
  onChange: (n: number) => void;
  "aria-label": string;
}) {
  return (
    <span className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="appearance-none rounded-md border border-input bg-background py-1.5 pl-3 pr-7 text-center font-mono text-[0.875rem] tabular-nums transition-colors hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        {...props}
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {pad2(n)}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}
