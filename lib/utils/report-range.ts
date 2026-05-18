import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export type Range = "week" | "month" | "last-week";

export function computeReportRange(
  range: Range,
  timezone: string,
  now: Date = new Date(),
): { from: Date; to: Date; label: string } {
  const nowLocal = toZonedTime(now, timezone);
  if (range === "month") {
    const startLocal = startOfMonth(nowLocal);
    const endLocal = endOfMonth(nowLocal);
    return {
      from: fromZonedTime(startLocal, timezone),
      to: fromZonedTime(endLocal, timezone),
      label: format(nowLocal, "MMMM yyyy"),
    };
  }
  if (range === "last-week") {
    const lastWeek = subWeeks(nowLocal, 1);
    const startLocal = startOfWeek(lastWeek, { weekStartsOn: 1 });
    const endLocal = endOfWeek(lastWeek, { weekStartsOn: 1 });
    return {
      from: fromZonedTime(startLocal, timezone),
      to: fromZonedTime(endLocal, timezone),
      label: `${format(startLocal, "d MMM")} – ${format(endLocal, "d MMM yyyy")}`,
    };
  }
  // default week
  const startLocal = startOfWeek(nowLocal, { weekStartsOn: 1 });
  const endLocal = endOfWeek(nowLocal, { weekStartsOn: 1 });
  return {
    from: fromZonedTime(startLocal, timezone),
    to: fromZonedTime(endLocal, timezone),
    label: `${format(startLocal, "d MMM")} – ${format(endLocal, "d MMM yyyy")}`,
  };
}

/**
 * Riempi i buchi nei dati per-day. Input: array sparso. Output: array completo
 * dal `from` (incluso) al `to` (incluso) con default 0.
 */
export function fillDailyGaps<T extends { day: string }>(
  data: T[],
  from: Date,
  to: Date,
  makeEmpty: (day: string) => T,
): T[] {
  const byDay = new Map(data.map((d) => [d.day, d]));
  const result: T[] = [];
  let cursor = new Date(from);
  while (cursor <= to) {
    const day = format(cursor, "yyyy-MM-dd");
    result.push(byDay.get(day) ?? makeEmpty(day));
    cursor = addDays(cursor, 1);
  }
  return result;
}
