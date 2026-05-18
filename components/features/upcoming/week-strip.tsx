"use client";

import Link from "next/link";
import { addDays, format, isSameDay, startOfWeek, subWeeks, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const WEEKDAY_SHORT_IT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

/**
 * Strip 7 giorni con day of week + day number. Cliccando un giorno setta
 * ?cursor=YYYY-MM-DD nell'URL (server re-render con quel range).
 */
export function WeekStrip({
  cursorDate,
  todayLocal,
}: {
  cursorDate: Date; // primo giorno mostrato (di solito oggi o lunedì settimana)
  todayLocal: Date;
}) {
  const weekStart = startOfWeek(cursorDate, { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));

  const prev = format(subWeeks(weekStart, 1), "yyyy-MM-dd");
  const next = format(addWeeks(weekStart, 1), "yyyy-MM-dd");
  const today = format(todayLocal, "yyyy-MM-dd");

  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="text-sm text-muted-foreground">
        {format(weekStart, "MMMM yyyy")}
      </div>
      <div className="flex items-center gap-1">
        <Link
          href={`?cursor=${prev}`}
          aria-label="Settimana precedente"
          className="size-7 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <Link
          href={`?cursor=${today}`}
          className="px-3 h-7 inline-flex items-center text-xs rounded-md border bg-card hover:bg-muted"
        >
          Oggi
        </Link>
        <Link
          href={`?cursor=${next}`}
          aria-label="Settimana successiva"
          className="size-7 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Riga visiva con i 7 giorni della settimana corrente (basata su cursorDate).
 * Cliccando un giorno scrolla all'ancora #day-yyyy-MM-dd.
 */
export function WeekDays({
  cursorDate,
  todayLocal,
}: {
  cursorDate: Date;
  todayLocal: Date;
}) {
  const weekStart = startOfWeek(cursorDate, { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));

  return (
    <ul className="grid grid-cols-7 border-b pb-2 mb-4">
      {days.map((d) => {
        const isToday = isSameDay(d, todayLocal);
        const dayOfWeek = WEEKDAY_SHORT_IT[d.getDay()];
        const dayNum = format(d, "d");
        const anchor = `day-${format(d, "yyyy-MM-dd")}`;
        return (
          <li key={d.toISOString()} className="text-center">
            <a
              href={`#${anchor}`}
              className="inline-flex items-center gap-1.5 text-sm hover:opacity-80"
            >
              <span className="text-muted-foreground">{dayOfWeek}</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-6 h-6 px-1 rounded text-xs font-medium tabular-nums",
                  isToday
                    ? "bg-red-500 text-white"
                    : "text-foreground",
                )}
              >
                {dayNum}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
