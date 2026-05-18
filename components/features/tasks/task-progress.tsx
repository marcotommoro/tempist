import { cn } from "@/lib/utils";

/**
 * Progress bar stima vs tracciato.
 *
 * Logica colori:
 *   - tracked == 0           → grigio (placeholder)
 *   - 0 < tracked < estimate → verde
 *   - tracked >= estimate    → arancione (over budget)
 *
 * Se nessuna stima → mostra solo i minuti tracked se >0, altrimenti niente.
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
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
        ⏱ {trackedMin}m
      </span>
    );
  }

  const ratio = trackedSeconds / (estimatedMinutes * 60);
  const cap = Math.min(1, ratio); // bar non oltre il 100%
  const over = ratio > 1;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
      <span
        className={cn(
          "h-1 w-12 rounded-full overflow-hidden",
          trackedSeconds === 0 ? "bg-muted" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "block h-full transition-[width]",
            trackedSeconds === 0
              ? "bg-transparent"
              : over
                ? "bg-orange-500"
                : "bg-green-500",
          )}
          style={{ width: `${cap * 100}%` }}
        />
      </span>
      <span
        className={cn(
          "text-muted-foreground",
          over && "text-orange-600 font-medium",
        )}
      >
        {trackedMin}/{estimatedMinutes}m
      </span>
    </span>
  );
}
