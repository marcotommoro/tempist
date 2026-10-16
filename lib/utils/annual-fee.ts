import { formatInTimeZone } from "date-fns-tz";

/**
 * Helper puri per i canoni annui. Le date sono stringhe ISO "YYYY-MM-DD" (colonne `date` in mode string):
 * il confronto lessicografico equivale a quello cronologico e non ci sono fusi orari di mezzo.
 */

export type FeeStatus = "overdue" | "due_soon" | "ok";

export const FEE_LEAD_DAYS = 30;

/** Data di oggi (YYYY-MM-DD) nella timezone dell'utente. */
export function todayIso(timezone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

/** Somma giorni a una data ISO (calendario UTC, quindi niente salti da ora legale). */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Stesso giorno dell'anno successivo; il 29 febbraio diventa il 28. */
export function addOneYear(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const lastDay = new Date(Date.UTC(y + 1, m, 0)).getUTCDate();
  return `${y + 1}-${String(m).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/**
 * Stato di un canone rispetto a oggi:
 *  - "overdue": la scadenza è passata e il rinnovo non è stato segnato come pagato
 *  - "due_soon": la scadenza cade entro `leadDays` giorni → promemoria attivo
 *  - "ok": niente da fare per ora
 *
 * Usa `addDaysIso(todayIso, leadDays)` per calcolare il limite della finestra.
 */
export function feeStatus(
  nextDueOn: string,
  today: string,
  leadDays: number = FEE_LEAD_DAYS,
): FeeStatus {
  // Il giorno della scadenza è ancora "scade oggi" (arancione); rosso dal giorno dopo.
  if (nextDueOn < today) return "overdue";
  // Finestra inclusiva: anche il giorno today + leadDays fa scattare il promemoria.
  if (nextDueOn <= addDaysIso(today, leadDays)) return "due_soon";
  return "ok";
}

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const shortDate = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatEur(amount: string | number): string {
  return eur.format(Number(amount));
}

export function formatIsoDate(iso: string): string {
  return shortDate.format(new Date(`${iso}T00:00:00Z`));
}

/** Giorni da `today` a `iso` (negativo se passato). */
export function daysUntil(iso: string, today: string): number {
  return Math.round(
    (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
}
