"use client";

import Link from "next/link";
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TaskGroupMode } from "@/lib/utils/group-by-project";

const WEEKDAY_SHORT_IT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

function weekHref(cursor: string, group: TaskGroupMode) {
  const params = new URLSearchParams({ cursor });
  if (group === "project") params.set("group", "project");
  return `?${params.toString()}`;
}

/**
 * Strip 7 giorni con day of week + day number. Cliccando un giorno setta
 * ?cursor=YYYY-MM-DD nell'URL.
 */
export function WeekStrip({
  cursorDate,
  todayLocal,
  group = "flat",
}: {
  cursorDate: Date;
  todayLocal: Date;
  group?: TaskGroupMode;
}) {
  const weekStart = startOfWeek(cursorDate, { weekStartsOn: 1 });

  const prev = format(subWeeks(weekStart, 1), "yyyy-MM-dd");
  const next = format(addWeeks(weekStart, 1), "yyyy-MM-dd");
  const today = format(todayLocal, "yyyy-MM-dd");

  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="font-display text-lg leading-none text-foreground">
        {format(weekStart, "MMMM yyyy")}
      </div>
      <div className="flex items-center gap-1">
        <Link
          href={weekHref(prev, group)}
          aria-label="Settimana precedente"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
        </Link>
        <Link
          href={weekHref(today, group)}
          className="inline-flex h-7 items-center rounded-md border border-border bg-card/40 px-2.5 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Today
        </Link>
        <Link
          href={weekHref(next, group)}
          aria-label="Settimana successiva"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Riga visiva con i 7 giorni della settimana corrente (basata su cursorDate).
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
    <ul className="mb-4 grid grid-cols-7 border-b border-border pb-3">
      {days.map((d) => {
        const isToday = isSameDay(d, todayLocal);
        const dayOfWeek = WEEKDAY_SHORT_IT[d.getDay()];
        const dayNum = format(d, "d");
        const anchor = `day-${format(d, "yyyy-MM-dd")}`;
        return (
          <li key={d.toISOString()} className="text-center">
            <a
              href={`#${anchor}`}
              className="group inline-flex flex-col items-center gap-0.5 hover:opacity-80"
            >
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
                {dayOfWeek}
              </span>
              <span
                className={cn(
                  "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 font-mono text-[0.75rem] font-medium tabular-nums transition-colors",
                  isToday
                    ? "bg-coral text-coral-foreground"
                    : "text-foreground group-hover:bg-accent",
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
