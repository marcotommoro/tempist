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

export function formatWeekLabel(from: Date, to: Date): string {
  const endInclusive = addDays(to, -1);
  return `${format(from, "d MMM", { locale: it })} – ${format(endInclusive, "d MMM yyyy", { locale: it })}`;
}

export function weekSearchParams(from: Date, clientId?: string): string {
  const params = new URLSearchParams();
  params.set("from", format(from, "yyyy-MM-dd"));
  if (clientId) params.set("clientId", clientId);
  return params.toString();
}
