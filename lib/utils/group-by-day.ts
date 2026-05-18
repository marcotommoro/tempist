/**
 * Raggruppa array di item per giorno locale (yyyy-MM-dd) basato su una loro
 * proprietà Date. Pure function, testabile.
 */

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => Date | null | undefined,
  timezone: string,
): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const d = getDate(item);
    if (!d) continue;
    const local = toZonedTime(d, timezone);
    const key = format(local, "yyyy-MM-dd");
    const arr = out.get(key);
    if (arr) arr.push(item);
    else out.set(key, [item]);
  }
  return out;
}

/**
 * Genera array di giorni dal `from` (incluso) per `count` giorni consecutivi.
 * Ogni elemento è un Date in tz locale (settato a mezzogiorno per evitare
 * edge case di DST shift).
 */
export function listDays(from: Date, count: number): Date[] {
  const result: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    d.setHours(12, 0, 0, 0);
    result.push(d);
  }
  return result;
}
