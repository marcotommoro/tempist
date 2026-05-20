import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { it } from "date-fns/locale";

export function getWeekRange(anchor: Date): { from: Date; to: Date } {
  const from = startOfWeek(anchor, { weekStartsOn: 1 });
  const to = addDays(endOfWeek(anchor, { weekStartsOn: 1 }), 1);
  return { from, to };
}

export function parseWeekFromParam(fromParam: string | undefined): Date {
  if (!fromParam) return new Date();
  const parsed = parseISO(fromParam);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function parseDateParam(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const parsed = parseISO(s);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Risolve il range del timesheet:
 *  - se entrambi from e to sono validi → range custom (esclusivo a destra: aggiungiamo 1 giorno per il filtro `lt`)
 *  - se solo from → settimana che contiene quella data
 *  - default → settimana corrente
 */
export function resolveTimesheetRange(
  fromParam: string | undefined,
  toParam: string | undefined,
): { from: Date; to: Date; isCustom: boolean } {
  const from = parseDateParam(fromParam);
  const to = parseDateParam(toParam);
  if (from && to) {
    return { from, to: addDays(to, 1), isCustom: true };
  }
  const anchor = from ?? new Date();
  const week = getWeekRange(anchor);
  return { ...week, isCustom: false };
}

export function formatWeekLabel(from: Date, to: Date): string {
  const endInclusive = addDays(to, -1);
  return `${format(from, "d MMM", { locale: it })} – ${format(endInclusive, "d MMM yyyy", { locale: it })}`;
}

export type TimesheetParams = {
  from?: Date;
  to?: Date;
  clientId?: string;
  projectId?: string;
};

export function timesheetSearchParams(opts: TimesheetParams): string {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", format(opts.from, "yyyy-MM-dd"));
  if (opts.to) params.set("to", format(opts.to, "yyyy-MM-dd"));
  if (opts.clientId) params.set("clientId", opts.clientId);
  if (opts.projectId) params.set("projectId", opts.projectId);
  return params.toString();
}

/**
 * @deprecated usa timesheetSearchParams. Lasciato per backwards-compat dei call site
 * che ancora passano (Date, string?).
 */
export function weekSearchParams(from: Date, clientId?: string): string {
  return timesheetSearchParams({ from, clientId });
}
