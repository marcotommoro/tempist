import { cn } from "@/lib/utils";

/**
 * Progress bar stima vs tracciato.
 *
 * Logica colori:
 *   - tracked == 0           → no render (estimate exists but nothing tracked)
 *   - 0 < tracked < estimate → sage
 *   - tracked >= estimate    → amber (over budget)
 */
export function TaskProgress({
  trackedSeconds,
  estimatedMinutes,
}: {
  trackedSeconds: number;
  estimatedMinutes: number | null;
}) {
  const trackedMin = Math.round(trackedSeconds / 60);

  // No estimate: mostra solo total tracked
  if (estimatedMinutes == null || estimatedMinutes <= 0) {
    if (trackedSeconds === 0) return null;
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
          done
        </span>
        <span className="tabular-nums">{trackedMin}m</span>
      </span>
    );
  }

  if (trackedSeconds === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
          est
        </span>
        <span className="tabular-nums">{estimatedMinutes}m</span>
      </span>
    );
  }

  const ratio = trackedSeconds / (estimatedMinutes * 60);
  const cap = Math.min(1, ratio);
  const over = ratio > 1;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="block h-[3px] w-14 overflow-hidden rounded-full bg-border">
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-[var(--dur-slow)]",
            over ? "bg-p2" : "bg-sage",
          )}
          style={{ width: `${cap * 100}%` }}
        />
      </span>
      <span
        className={cn(
          "tabular-nums",
          over ? "text-p2 font-medium" : "text-muted-foreground",
        )}
      >
        {trackedMin}/{estimatedMinutes}m
      </span>
    </span>
  );
}
