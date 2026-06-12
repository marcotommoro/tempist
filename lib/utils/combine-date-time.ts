import { format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

/**
 * Compone una data calendariale (Date) + un time string "HH:mm" in un istante UTC,
 * interpretando il tempo nel fuso dell'utente (non in quello del browser).
 *
 * Senza la conversione esplicita via fromZonedTime, `new Date('YYYY-MM-DDTHH:mm:00')`
 * userebbe il fuso locale del browser → bug quando l'utente è in viaggio.
 */
export function combineDateTime(
  dateLocal: Date,
  timeStr: string,
  tz: string,
): Date {
  const dateStr = format(dateLocal, "yyyy-MM-dd");
  return fromZonedTime(`${dateStr}T${timeStr}:00`, tz);
}
