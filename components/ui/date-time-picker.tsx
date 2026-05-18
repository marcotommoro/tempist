"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [timeStr, setTimeStr] = useState<string>(
    value ? `${pad2(value.getHours())}:${pad2(value.getMinutes())}` : `${pad2(defaultHour)}:${pad2(defaultMinute)}`,
  );

  function applyDate(d: Date | undefined) {
    if (!d) return;
    const [hStr, mStr] = timeStr.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    const next = new Date(d);
    next.setHours(Number.isFinite(h) ? h : defaultHour, Number.isFinite(m) ? m : defaultMinute, 0, 0);
    onChange(next);
  }

  function onTimeChange(newTime: string) {
    setTimeStr(newTime);
    if (!value) return;
    const [hStr, mStr] = newTime.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
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
            "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-left",
            "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          {value ? format(value, "EEE d MMM yyyy HH:mm") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={applyDate}
          autoFocus
        />
        <div className="border-t pt-2 mt-1 flex items-center gap-2 px-1">
          <label className="text-xs text-muted-foreground">Ora</label>
          <Input
            type="time"
            value={timeStr}
            onChange={(e) => onTimeChange(e.target.value)}
            className="h-8 w-28 text-sm"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
          >
            OK
          </button>
        </div>
        {allowClear && value && (
          <div className="border-t pt-2 mt-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              <X className="size-3.5" /> Rimuovi data
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
