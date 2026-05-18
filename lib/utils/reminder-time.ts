/**
 * Pure helpers per il timing dei reminder.
 *
 * Trigger types:
 *  - TIME: triggerValue è una stringa ISO datetime UTC (es. "2026-05-20T08:00:00.000Z")
 *  - RELATIVE: triggerValue è offset rispetto a task.scheduledAt
 *      Formato: "{sign}{n}{unit}" — sign opzionale (default "-"), n intero positivo,
 *      unit ∈ m|h|d|w.
 *      Esempi: "-30m" (30min prima), "-1h", "-2d", "-1w".
 *      "+1h" significa 1 ora dopo lo scheduledAt (insolito ma supportato).
 */

const RELATIVE_RE = /^([+-]?)(\d+)([mhdw])$/;

const UNIT_MS = {
  m: 60_000,
  h: 60 * 60_000,
  d: 24 * 60 * 60_000,
  w: 7 * 24 * 60 * 60_000,
} as const;

export type ParsedRelative = { offsetMs: number };

export function parseRelativeOffset(value: string): ParsedRelative | null {
  const match = value.trim().match(RELATIVE_RE);
  if (!match) return null;
  const sign = match[1] === "+" ? 1 : -1;
  const n = Number.parseInt(match[2] ?? "0", 10);
  const unit = match[3] as keyof typeof UNIT_MS;
  return { offsetMs: sign * n * UNIT_MS[unit] };
}

/**
 * Calcola l'istante in cui un reminder deve essere triggered.
 *
 * Ritorna null se:
 *  - triggerType è TIME ma il valore non è ISO valido
 *  - triggerType è RELATIVE ma il task non ha scheduledAt
 *  - triggerType è RELATIVE e il formato non parsa
 */
export function computeTriggerTime(opts: {
  triggerType: "TIME" | "RELATIVE";
  triggerValue: string;
  taskScheduledAt: Date | null;
}): Date | null {
  if (opts.triggerType === "TIME") {
    const t = new Date(opts.triggerValue);
    return Number.isNaN(t.getTime()) ? null : t;
  }
  // RELATIVE
  if (!opts.taskScheduledAt) return null;
  const parsed = parseRelativeOffset(opts.triggerValue);
  if (!parsed) return null;
  return new Date(opts.taskScheduledAt.getTime() + parsed.offsetMs);
}

/**
 * Format umano-leggibile dell'offset relativo.
 *   "-1h" → "1 ora prima"
 *   "-30m" → "30 min prima"
 *   "+1d" → "1 giorno dopo"
 */
export function formatRelativeOffset(value: string): string {
  const parsed = parseRelativeOffset(value);
  if (!parsed) return value;
  const match = value.trim().match(RELATIVE_RE);
  if (!match) return value;
  const n = Number.parseInt(match[2] ?? "0", 10);
  const unit = match[3];
  const after = parsed.offsetMs > 0;
  const unitLabel =
    unit === "m"
      ? n === 1
        ? "min"
        : "min"
      : unit === "h"
        ? n === 1
          ? "ora"
          : "ore"
        : unit === "d"
          ? n === 1
            ? "giorno"
            : "giorni"
          : n === 1
            ? "settimana"
            : "settimane";
  return `${n} ${unitLabel} ${after ? "dopo" : "prima"}`;
}
