"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Loader2 } from "lucide-react";

import {
  upsertProjectQuickEntryAction,
  upsertQuickEntryAction,
} from "@/lib/actions/timer";
import type { ResolvedBillingRange } from "@/lib/utils/billing-period";
import { formatBillingPeriodLabel } from "@/lib/utils/billing-period";
import { cn } from "@/lib/utils";

import { QuickEntryPeriodFilters } from "./quick-entry-period-filters";

type Column = { id: string | null; name: string };

type CellSeed = {
  dayKey: string;
  columnId: string | null;
  managedSeconds: number;
  totalSeconds: number;
};

type CellState = {
  managedSeconds: number;
  totalSeconds: number;
  draft: string;
  status: "idle" | "pending" | "error";
  error?: string;
};

type ClientGridProps = {
  mode: "client";
  entityId: string;
  columns: Column[];
  days: Date[];
  range: ResolvedBillingRange;
  cells: CellSeed[];
  basePath: string;
  preservedParams?: Record<string, string>;
  exportHref?: string;
  noneColumnLabel?: string;
};

type ProjectGridProps = {
  mode: "project";
  entityId: string;
  columns: Column[];
  days: Date[];
  range: ResolvedBillingRange;
  cells: CellSeed[];
  basePath: string;
  preservedParams?: Record<string, string>;
  exportHref?: string;
  noneColumnLabel?: string;
};

type Props = ClientGridProps | ProjectGridProps;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function cellKey(dayKey: string, columnId: string | null): string {
  return `${dayKey}::${columnId ?? ""}`;
}

function secondsToInput(secs: number): string {
  if (secs <= 0) return "";
  const totalMinutes = Math.round(secs / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return String(h);
  return `${h}:${pad2(m)}`;
}

function formatHours(secs: number): string {
  if (secs <= 0) return "";
  const hours = secs / 3600;
  if (Number.isInteger(hours)) return `${hours}h`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${pad2(m)}`;
}

function parseHours(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return 0;
  const colon = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (m >= 60) return null;
    return h + m / 60;
  }
  const hm = trimmed.match(/^(\d+)\s*h\s*(\d+)\s*m?$/);
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (m >= 60) return null;
    return h + m / 60;
  }
  const onlyH = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*h?$/);
  if (onlyH && onlyH[1] != null) {
    return Number(onlyH[1].replace(",", "."));
  }
  return null;
}

function buildCellMap(seeds: CellSeed[]): Map<string, CellState> {
  const m = new Map<string, CellState>();
  for (const s of seeds) {
    m.set(cellKey(s.dayKey, s.columnId), {
      managedSeconds: s.managedSeconds,
      totalSeconds: s.totalSeconds,
      draft: secondsToInput(s.managedSeconds),
      status: "idle",
    });
  }
  return m;
}

export function WeeklyQuickEntryGrid(props: Props) {
  const {
    mode,
    entityId,
    columns: rawColumns,
    days,
    range,
    cells: initialCells,
    basePath,
    preservedParams,
    exportHref,
    noneColumnLabel = mode === "client" ? "Senza progetto" : "Senza task",
  } = props;

  const [cells, setCells] = useState<Map<string, CellState>>(() =>
    buildCellMap(initialCells),
  );
  const [, startTransition] = useTransition();
  const lastSeedsRef = useRef(initialCells);

  useEffect(() => {
    if (lastSeedsRef.current === initialCells) return;
    lastSeedsRef.current = initialCells;
    setCells(buildCellMap(initialCells));
  }, [initialCells]);

  const columns: Column[] = [...rawColumns, { id: null, name: noneColumnLabel }];
  const periodLabel = formatBillingPeriodLabel(range);

  async function upsertCell(
    dayKey: string,
    columnId: string | null,
    hours: number,
  ) {
    if (mode === "client") {
      return upsertQuickEntryAction({
        clientId: entityId,
        projectId: columnId,
        dayKey,
        hours,
      });
    }
    return upsertProjectQuickEntryAction({
      projectId: entityId,
      taskId: columnId,
      dayKey,
      hours,
    });
  }

  function commitCell(dayKey: string, columnId: string | null, rawInput: string) {
    const key = cellKey(dayKey, columnId);
    const current = cells.get(key);
    const fallbackManaged = current?.managedSeconds ?? 0;
    const fallbackTotal = current?.totalSeconds ?? 0;
    const parsed = parseHours(rawInput);

    if (parsed == null) {
      setCells((prev) => {
        const next = new Map(prev);
        next.set(key, {
          managedSeconds: fallbackManaged,
          totalSeconds: fallbackTotal,
          draft: secondsToInput(fallbackManaged),
          status: "error",
          error: "Formato: 2.5 · 2,5 · 2:30 · 1h30",
        });
        return next;
      });
      return;
    }
    if (parsed > 24) {
      setCells((prev) => {
        const next = new Map(prev);
        next.set(key, {
          managedSeconds: fallbackManaged,
          totalSeconds: fallbackTotal,
          draft: secondsToInput(fallbackManaged),
          status: "error",
          error: "Max 24h",
        });
        return next;
      });
      return;
    }

    const targetSeconds = Math.round(parsed * 3600);
    if (current && targetSeconds === current.managedSeconds && current.status !== "error") {
      const normalized = secondsToInput(current.managedSeconds);
      if (current.draft !== normalized) {
        setCells((prev) => {
          const next = new Map(prev);
          next.set(key, { ...current, draft: normalized, status: "idle", error: undefined });
          return next;
        });
      }
      return;
    }

    const otherSeconds = Math.max(0, fallbackTotal - fallbackManaged);
    setCells((prev) => {
      const next = new Map(prev);
      next.set(key, {
        managedSeconds: targetSeconds,
        totalSeconds: otherSeconds + targetSeconds,
        draft: secondsToInput(targetSeconds),
        status: "pending",
      });
      return next;
    });

    startTransition(async () => {
      const res = await upsertCell(dayKey, columnId, parsed);
      setCells((prev) => {
        const next = new Map(prev);
        if (!res.ok) {
          next.set(key, {
            managedSeconds: fallbackManaged,
            totalSeconds: fallbackTotal,
            draft: secondsToInput(fallbackManaged),
            status: "error",
            error: res.error,
          });
          return next;
        }
        next.set(key, {
          managedSeconds: res.data.durationSeconds,
          totalSeconds: otherSeconds + res.data.durationSeconds,
          draft: secondsToInput(res.data.durationSeconds),
          status: "idle",
        });
        return next;
      });
    });
  }

  const dayTotals = new Map<string, number>();
  const columnTotals = new Map<string, number>();
  let grandTotal = 0;
  for (const day of days) {
    const dk = dayKeyOf(day);
    let dayTotal = 0;
    for (const col of columns) {
      const c = cells.get(cellKey(dk, col.id));
      const v = c?.totalSeconds ?? 0;
      dayTotal += v;
      const pk = col.id ?? "__none__";
      columnTotals.set(pk, (columnTotals.get(pk) ?? 0) + v);
    }
    dayTotals.set(dk, dayTotal);
    grandTotal += dayTotal;
  }

  const today = new Date();

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-1.5">
        <div className="space-y-1">
          <h2 className="section-heading text-muted-foreground">
            Inserimento rapido
          </h2>
          <p className="font-mono text-[0.625em] uppercase tracking-wider text-muted-foreground">
            {periodLabel}
          </p>
        </div>
        <QuickEntryPeriodFilters
          basePath={basePath}
          from={range.from}
          to={range.toInclusive}
          presetActive={range.active}
          preservedParams={preservedParams}
          exportHref={exportHref}
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-eyebrow">
              <th className="sticky left-0 z-10 bg-muted/30 px-3 py-2 font-normal">
                Giorno
              </th>
              {columns.map((col) => (
                <th
                  key={col.id ?? "__none__"}
                  className="px-2 py-2 text-right font-normal max-w-[8rem] truncate"
                  title={col.name}
                >
                  {col.id ? (
                    col.name
                  ) : (
                    <span className="font-serif italic text-muted-foreground">
                      {col.name}
                    </span>
                  )}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-normal">Tot.</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const dk = dayKeyOf(day);
              const isToday = isSameDay(day, today);
              const dayTotal = dayTotals.get(dk) ?? 0;
              return (
                <tr
                  key={dk}
                  className={cn(
                    "border-b border-border last:border-0",
                    isToday && "bg-sage/5",
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 z-10 bg-card px-3 py-1.5 text-left font-normal",
                      isToday && "bg-sage/5",
                    )}
                  >
                    <div className="font-mono text-[0.6875em] uppercase tracking-wider text-muted-foreground">
                      {format(day, "EEE", { locale: it })}
                    </div>
                    <div
                      className={cn(
                        "font-display text-[0.95em] leading-tight tabular-nums",
                        isToday ? "text-coral" : "text-foreground",
                      )}
                    >
                      {format(day, "d MMM", { locale: it })}
                    </div>
                  </th>
                  {columns.map((col) => {
                    const key = cellKey(dk, col.id);
                    const state = cells.get(key);
                    const managed = state?.managedSeconds ?? 0;
                    const total = state?.totalSeconds ?? 0;
                    const other = Math.max(0, total - managed);
                    return (
                      <td key={key} className="px-1 py-1 align-top">
                        <QuickCell
                          value={state?.draft ?? ""}
                          status={state?.status ?? "idle"}
                          error={state?.error}
                          otherSeconds={other}
                          onChange={(v) => {
                            setCells((prev) => {
                              const next = new Map(prev);
                              const cur = prev.get(key) ?? {
                                managedSeconds: 0,
                                totalSeconds: 0,
                                draft: "",
                                status: "idle" as const,
                              };
                              next.set(key, { ...cur, draft: v, status: "idle", error: undefined });
                              return next;
                            });
                          }}
                          onCommit={(v) => commitCell(dk, col.id, v)}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right align-top font-mono tabular-nums text-foreground">
                    {dayTotal > 0 ? formatHours(dayTotal) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20 text-eyebrow">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-muted/20 px-3 py-2 text-left font-normal"
              >
                Totale
              </th>
              {columns.map((col) => {
                const pk = col.id ?? "__none__";
                const tot = columnTotals.get(pk) ?? 0;
                return (
                  <td
                    key={pk}
                    className="px-2 py-2 text-right font-mono tabular-nums text-foreground"
                  >
                    {tot > 0 ? formatHours(tot) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                {grandTotal > 0 ? formatHours(grandTotal) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="font-mono text-[0.625em] uppercase tracking-wider text-muted-foreground">
        Tab/Enter o blur per salvare · Formato: 2.5 · 2,5 · 2:30 · 1h30
      </p>
    </section>
  );
}

function QuickCell({
  value,
  status,
  error,
  otherSeconds,
  onChange,
  onCommit,
}: {
  value: string;
  status: "idle" | "pending" | "error";
  error?: string;
  otherSeconds: number;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
}) {
  return (
    <div>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onCommit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="—"
          disabled={status === "pending"}
          aria-invalid={status === "error"}
          aria-label={error ?? "Ore"}
          className={cn(
            "h-9 w-full rounded border border-transparent bg-transparent px-2 text-right font-mono text-[0.875em] tabular-nums text-foreground transition-colors",
            "hover:bg-accent focus:border-ring focus:bg-background focus:outline-none",
            status === "error" && "border-destructive/60 bg-destructive/5 text-destructive",
            status === "pending" && "opacity-60",
          )}
        />
        {status === "pending" && (
          <Loader2
            aria-hidden
            className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
        {status === "error" && error && (
          <div className="absolute left-0 right-0 top-full z-20 mt-0.5 rounded border border-destructive/60 bg-background px-1.5 py-0.5 text-[0.625em] text-destructive shadow-sm">
            {error}
          </div>
        )}
      </div>
      {otherSeconds > 0 && status !== "error" && (
        <div
          className="pointer-events-none px-2 pt-0.5 text-right font-mono text-[0.5625em] leading-none tracking-wide text-muted-foreground"
          title="Ore già tracciate da altre voci (timer/voce manuale)"
        >
          +{formatHours(otherSeconds)}
        </div>
      )}
    </div>
  );
}
