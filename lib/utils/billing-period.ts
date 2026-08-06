import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import { it } from "date-fns/locale";

export type BillingPreset = "month" | "last-month" | "all" | "custom";

export type ResolvedBillingRange = {
  from: Date;
  toInclusive: Date;
  queryToExclusive: Date;
  active: BillingPreset;
};

export function safeParseDate(s: string): Date | null {
  const d = parseISO(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDateParam(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function resolveBillingRange(params: {
  from?: string;
  to?: string;
  preset?: string;
}): ResolvedBillingRange {
  const fromParam = params.from ? safeParseDate(params.from) : null;
  const toParam = params.to ? safeParseDate(params.to) : null;
  if (fromParam && toParam) {
    return {
      from: fromParam,
      toInclusive: toParam,
      queryToExclusive: addDays(toParam, 1),
      active: "custom",
    };
  }
  const now = new Date();
  if (params.preset === "last-month") {
    const lastMonth = subMonths(now, 1);
    const from = startOfMonth(lastMonth);
    const toInclusive = endOfMonth(lastMonth);
    return {
      from,
      toInclusive,
      queryToExclusive: addDays(toInclusive, 1),
      active: "last-month",
    };
  }
  if (params.preset === "all") {
    const from = startOfYear(subMonths(now, 60));
    const toInclusive = endOfYear(now);
    return {
      from,
      toInclusive,
      queryToExclusive: addDays(toInclusive, 1),
      active: "all",
    };
  }
  const from = startOfMonth(now);
  const toInclusive = endOfMonth(now);
  return {
    from,
    toInclusive,
    queryToExclusive: addDays(toInclusive, 1),
    active: "month",
  };
}

const MAX_GRID_DAYS = 31;

export function getGridDisplayDays(range: ResolvedBillingRange): Date[] {
  let displayFrom = range.from;
  let displayToInclusive = range.toInclusive;

  if (range.active === "all") {
    const now = new Date();
    displayFrom = startOfMonth(now);
    displayToInclusive = endOfMonth(now);
  } else {
    const dayCount =
      differenceInCalendarDays(displayToInclusive, displayFrom) + 1;
    if (dayCount > MAX_GRID_DAYS) {
      displayToInclusive = addDays(displayFrom, MAX_GRID_DAYS - 1);
    }
  }

  const days: Date[] = [];
  let cursor = displayFrom;
  while (cursor <= displayToInclusive) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function formatBillingPeriodLabel(range: ResolvedBillingRange): string {
  if (range.active === "all") {
    return "Tutto · mese corrente";
  }
  if (range.active === "month" || range.active === "last-month") {
    return format(range.from, "MMMM yyyy", { locale: it });
  }
  return `${format(range.from, "d MMM", { locale: it })} – ${format(range.toInclusive, "d MMM yyyy", { locale: it })}`;
}

export function buildBillingHref(
  basePath: string,
  opts: {
    preset?: BillingPreset;
    from?: Date;
    to?: Date;
    extra?: Record<string, string>;
  },
): string {
  const params = new URLSearchParams();
  if (opts.extra) {
    for (const [k, v] of Object.entries(opts.extra)) {
      if (v) params.set(k, v);
    }
  }
  if (opts.preset && opts.preset !== "custom") {
    params.set("preset", opts.preset);
  } else if (opts.from && opts.to) {
    params.set("from", toDateParam(opts.from));
    params.set("to", toDateParam(opts.to));
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
