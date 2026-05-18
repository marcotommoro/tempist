"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: Date | null;
  onChange: (d: Date | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Seleziona data",
  allowClear = true,
  align = "start",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

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
          {value ? format(value, "EEE d MMM yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d) => {
            if (d) {
              onChange(d);
              setOpen(false);
            }
          }}
          autoFocus
        />
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
