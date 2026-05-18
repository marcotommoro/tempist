import { endOfDay, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Ritorna {startUtc, endUtc}: gli istanti UTC che corrispondono a
 * "inizio oggi" e "fine oggi" nella timezone dell'utente.
 *
 * Funzione pura (nessuna dipendenza DB) per essere testabile in unit isolation.
 */
export function todayBoundsUtc(
  timezone: string,
  now: Date = new Date(),
): { startUtc: Date; endUtc: Date } {
  const nowLocal = toZonedTime(now, timezone);
  const startLocal = startOfDay(nowLocal);
  const endLocal = endOfDay(nowLocal);
  return {
    startUtc: fromZonedTime(startLocal, timezone),
    endUtc: fromZonedTime(endLocal, timezone),
  };
}
