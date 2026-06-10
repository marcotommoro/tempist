/**
 * Modello filtri condiviso per Reports / Timesheet / Dettaglio cliente.
 *
 * File PURO (niente "use server", niente import server-only): è importato sia dai
 * Server Component (parse iniziale dall'URL) sia dai client hook (stato + queryKey).
 *
 * Convenzione range: tutte le funzioni dominio usano [from, to) — gte(from), lt(to).
 * Quindi `resolveDateRange` ritorna un `to` ESCLUSIVO (mezzanotte locale del giorno
 * successivo alla fine del periodo), riusando il pattern TZ di lib/utils/report-range.ts.
 */

import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import { it } from "date-fns/locale";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export type ReportPreset =
  | "this-month"
  | "last-month"
  | "quarter"
  | "year"
  | "custom";
export type GroupBy = "client" | "project" | "task" | "day" | "tag" | "user";
export type ViewType = "chart" | "table" | "grid" | "kanban";
export type Metric = "hours" | "amount";

export type ReportScope =
  | { kind: "org" }
  | { kind: "user"; userId: string }
  | { kind: "client"; clientId: string };

export interface ReportFilters {
  preset: ReportPreset;
  /** Giorno inclusivo "yyyy-MM-dd"; valorizzato solo con preset === "custom". */
  from: string | null;
  /** Giorno inclusivo "yyyy-MM-dd"; valorizzato solo con preset === "custom". */
  to: string | null;
  /** Chip mese "yyyy-MM" selezionati (multi). Se non vuoto, vince sul preset. */
  months: string[];
  groupBy: GroupBy;
  view: ViewType;
  clientIds: string[];
  projectIds: string[];
  compare: boolean;
  metric: Metric;
}

const PRESETS = new Set<ReportPreset>([
  "this-month",
  "last-month",
  "quarter",
  "year",
  "custom",
]);
const GROUP_BYS = new Set<GroupBy>([
  "client",
  "project",
  "task",
  "day",
  "tag",
  "user",
]);
const VIEWS = new Set<ViewType>(["chart", "table", "grid", "kanban"]);
const METRICS = new Set<Metric>(["hours", "amount"]);

// ---------------------------------------------------------------------------
// Default per scope
// ---------------------------------------------------------------------------

export function defaultFilters(scope: ReportScope): ReportFilters {
  const base: ReportFilters = {
    preset: "this-month",
    from: null,
    to: null,
    months: [],
    groupBy: "client",
    view: "chart",
    clientIds: [],
    projectIds: [],
    compare: false,
    metric: "hours",
  };
  if (scope.kind === "user") {
    // Timesheet: la lista per giorno è la vista naturale.
    return { ...base, groupBy: "day", view: "table" };
  }
  if (scope.kind === "client") {
    // Dettaglio cliente: breakdown per progetto in tabella.
    return { ...base, groupBy: "project", view: "table" };
  }
  return base;
}

// ---------------------------------------------------------------------------
// URL <-> filtri
// ---------------------------------------------------------------------------

function splitCsv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseFilters(
  params: URLSearchParams,
  scope: ReportScope,
): ReportFilters {
  const f = defaultFilters(scope);

  const preset = params.get("preset");
  if (preset && PRESETS.has(preset as ReportPreset)) f.preset = preset as ReportPreset;

  const groupBy = params.get("groupBy");
  if (groupBy && GROUP_BYS.has(groupBy as GroupBy)) f.groupBy = groupBy as GroupBy;

  const view = params.get("view");
  if (view && VIEWS.has(view as ViewType)) f.view = view as ViewType;

  const metric = params.get("metric");
  if (metric && METRICS.has(metric as Metric)) f.metric = metric as Metric;

  const from = params.get("from");
  if (from) f.from = from;
  const to = params.get("to");
  if (to) f.to = to;

  f.months = splitCsv(params.get("months"));
  f.clientIds = splitCsv(params.get("clientIds"));
  f.projectIds = splitCsv(params.get("projectIds"));

  const compare = params.get("compare");
  f.compare = compare === "1" || compare === "true";

  return f;
}

/**
 * Serializza omettendo i valori di default (URL corti e leggibili).
 * `scope` serve a sapere quali default applicare a groupBy/view (variano per pagina).
 */
export function serializeFilters(
  filters: ReportFilters,
  scope: ReportScope = { kind: "org" },
): string {
  const d = defaultFilters(scope);
  const p = new URLSearchParams();

  if (filters.preset !== d.preset) p.set("preset", filters.preset);
  if (filters.groupBy !== d.groupBy) p.set("groupBy", filters.groupBy);
  if (filters.view !== d.view) p.set("view", filters.view);
  if (filters.metric !== d.metric) p.set("metric", filters.metric);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.months.length) p.set("months", filters.months.join(","));
  if (filters.clientIds.length) p.set("clientIds", filters.clientIds.join(","));
  if (filters.projectIds.length) p.set("projectIds", filters.projectIds.join(","));
  if (filters.compare) p.set("compare", "1");

  return p.toString();
}

// ---------------------------------------------------------------------------
// Risoluzione periodo → istanti UTC [from, to)
// ---------------------------------------------------------------------------

export interface ResolvedRange {
  from: Date;
  to: Date;
  label: string;
}

/** "yyyy-MM" → indice ordinabile + Date locale (giorno 1) via parseISO. */
function monthStartLocal(month: string): Date {
  return startOfMonth(parseISO(`${month}-01`));
}

export function resolveDateRange(
  filters: ReportFilters,
  timezone: string,
  now: Date = new Date(),
): ResolvedRange {
  const nowLocal = toZonedTime(now, timezone);
  const toUtc = (local: Date) => fromZonedTime(local, timezone);

  // I chip mese vincono sul preset: range = dal mese più vecchio alla fine del più recente.
  if (filters.months.length > 0) {
    const sorted = [...filters.months].sort();
    const earliest = monthStartLocal(sorted[0]!);
    const latest = monthStartLocal(sorted[sorted.length - 1]!);
    const fromLocal = earliest;
    const toLocal = addMonths(latest, 1);
    const label =
      sorted.length === 1
        ? format(earliest, "MMMM yyyy", { locale: it })
        : `${format(earliest, "MMM yyyy", { locale: it })} – ${format(latest, "MMM yyyy", { locale: it })}`;
    return { from: toUtc(fromLocal), to: toUtc(toLocal), label };
  }

  switch (filters.preset) {
    case "last-month": {
      const fromLocal = startOfMonth(addMonths(nowLocal, -1));
      const toLocal = startOfMonth(nowLocal);
      return {
        from: toUtc(fromLocal),
        to: toUtc(toLocal),
        label: format(fromLocal, "MMMM yyyy", { locale: it }),
      };
    }
    case "quarter": {
      const fromLocal = startOfQuarter(nowLocal);
      const toLocal = addMonths(fromLocal, 3);
      const q = Math.floor(fromLocal.getMonth() / 3) + 1;
      return {
        from: toUtc(fromLocal),
        to: toUtc(toLocal),
        label: `T${q} ${fromLocal.getFullYear()}`,
      };
    }
    case "year": {
      const fromLocal = startOfYear(nowLocal);
      const toLocal = addMonths(fromLocal, 12);
      return {
        from: toUtc(fromLocal),
        to: toUtc(toLocal),
        label: `${fromLocal.getFullYear()}`,
      };
    }
    case "custom": {
      if (filters.from && filters.to) {
        const fromLocal = startOfDay(parseISO(filters.from));
        const toInclusive = startOfDay(parseISO(filters.to));
        const toLocal = addDays(toInclusive, 1); // estremo destro esclusivo
        return {
          from: toUtc(fromLocal),
          to: toUtc(toLocal),
          label: `${format(fromLocal, "d MMM", { locale: it })} – ${format(toInclusive, "d MMM yyyy", { locale: it })}`,
        };
      }
      // custom senza date valide → fallback a mese corrente
      break;
    }
    case "this-month":
    default:
      break;
  }

  // default: mese corrente
  const fromLocal = startOfMonth(nowLocal);
  const toLocal = addMonths(fromLocal, 1);
  return {
    from: toUtc(fromLocal),
    to: toUtc(toLocal),
    label: format(fromLocal, "MMMM yyyy", { locale: it }),
  };
}

/**
 * Periodo di CONFRONTO (modalità "confronto periodi"): dato il periodo corrente,
 * ritorna quello precedente con cui calcolare il delta %.
 *
 * Strategia: calendar-aware per i preset (sposta `now` indietro di un periodo e
 * ri-risolvi con `resolveDateRange`), duration-shift per il custom (gli N giorni
 * immediatamente prima di `from`), stesso numero di mesi appena prima per months[].
 */
export function resolvePreviousRange(
  filters: ReportFilters,
  timezone: string,
  now: Date = new Date(),
): ResolvedRange {
  const toUtc = (local: Date) => fromZonedTime(local, timezone);

  // Chip mese: stesso numero di mesi immediatamente prima del più vecchio.
  if (filters.months.length > 0) {
    const sorted = [...filters.months].sort();
    const earliest = monthStartLocal(sorted[0]!);
    const latest = monthStartLocal(sorted[sorted.length - 1]!);
    const spanMonths = differenceInCalendarMonths(addMonths(latest, 1), earliest);
    const fromLocal = addMonths(earliest, -spanMonths);
    const lastLocal = addMonths(earliest, -1);
    const label =
      spanMonths === 1
        ? format(fromLocal, "MMMM yyyy", { locale: it })
        : `${format(fromLocal, "MMM yyyy", { locale: it })} – ${format(lastLocal, "MMM yyyy", { locale: it })}`;
    return { from: toUtc(fromLocal), to: toUtc(earliest), label };
  }

  // Custom (N giorni): duration-shift, gli N giorni subito prima di `from`.
  if (filters.preset === "custom" && filters.from && filters.to) {
    const fromLocal = startOfDay(parseISO(filters.from));
    const toLocal = addDays(startOfDay(parseISO(filters.to)), 1); // esclusivo
    const days = differenceInCalendarDays(toLocal, fromLocal);
    const prevFromLocal = addDays(fromLocal, -days);
    const prevLastLocal = addDays(fromLocal, -1);
    return {
      from: toUtc(prevFromLocal),
      to: toUtc(fromLocal),
      label: `${format(prevFromLocal, "d MMM", { locale: it })} – ${format(prevLastLocal, "d MMM yyyy", { locale: it })}`,
    };
  }

  // Preset calendario: ri-risolvi con `now` spostato indietro di un periodo.
  const shiftMonths =
    filters.preset === "quarter" ? 3 : filters.preset === "year" ? 12 : 1;
  return resolveDateRange(filters, timezone, addMonths(now, -shiftMonths));
}
