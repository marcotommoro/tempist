import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { it } from "date-fns/locale";

export type TimesheetPreset = "month" | "week" | "custom";

export function getWeekRange(anchor: Date): { from: Date; to: Date } {
  const from = startOfWeek(anchor, { weekStartsOn: 1 });
  const to = addDays(endOfWeek(anchor, { weekStartsOn: 1 }), 1);
  return { from, to };
}

export function getMonthRange(anchor: Date): { from: Date; to: Date } {
  const from = startOfMonth(anchor);
  const to = addDays(endOfMonth(anchor), 1);
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
 *  - se entrambi from e to sono validi → range custom (esclusivo a destra)
 *  - se preset=week → settimana che contiene from (o oggi)
 *  - default → mese corrente (o mese che contiene from)
 */
export function resolveTimesheetRange(
  fromParam: string | undefined,
  toParam: string | undefined,
  presetParam?: string | undefined,
): { from: Date; to: Date; preset: TimesheetPreset } {
  const from = parseDateParam(fromParam);
  const to = parseDateParam(toParam);
  if (from && to) {
    return { from, to: addDays(to, 1), preset: "custom" };
  }
  if (presetParam === "week") {
    const anchor = from ?? new Date();
    const week = getWeekRange(anchor);
    return { ...week, preset: "week" };
  }
  const anchor = from ?? new Date();
  const month = getMonthRange(anchor);
  return { ...month, preset: "month" };
}

export function formatWeekLabel(from: Date, to: Date): string {
  const endInclusive = addDays(to, -1);
  return `${format(from, "d MMM", { locale: it })} – ${format(endInclusive, "d MMM yyyy", { locale: it })}`;
}

export function formatMonthLabel(from: Date): string {
  return format(from, "MMMM yyyy", { locale: it });
}

export function formatPeriodLabel(
  from: Date,
  to: Date,
  preset: TimesheetPreset,
): string {
  if (preset === "month") return formatMonthLabel(from);
  return formatWeekLabel(from, to);
}

export type TimesheetParams = {
  from?: Date;
  to?: Date;
  preset?: "week" | "month";
  clientId?: string;
  projectId?: string;
};

export function timesheetSearchParams(opts: TimesheetParams): string {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", format(opts.from, "yyyy-MM-dd"));
  if (opts.to) params.set("to", format(opts.to, "yyyy-MM-dd"));
  if (opts.preset) params.set("preset", opts.preset);
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
