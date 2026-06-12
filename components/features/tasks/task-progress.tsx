import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";

/**
 * Progress bar stima vs tracciato.
 *
 * Logica colori:
 *   - tracked == 0           → no render (estimate exists but nothing tracked)
 *   - 0 < tracked < estimate → sage
 *   - tracked >= estimate    → amber (over budget)
 *
 * Quando `live` è true il task ha un timer in corso: mostriamo la durata che
 * scorre (HH:MM:SS, pulse coral) come in header/time-entries, più la barra di
 * budget se esiste una stima. `trackedSeconds` include già il delta live.
 */
export function TaskProgress({
  trackedSeconds,
  estimatedMinutes,
  live = false,
}: {
  trackedSeconds: number;
  estimatedMinutes: number | null;
  live?: boolean;
}) {
  const trackedMin = Math.round(trackedSeconds / 60);

  if (live) {
    const hasEstimate = estimatedMinutes != null && estimatedMinutes > 0;
    const ratio = hasEstimate ? trackedSeconds / (estimatedMinutes! * 60) : 0;
    const over = ratio > 1;
    return (
      <span className="inline-flex items-center gap-2">
        {hasEstimate && (
          <span className="block h-[3px] w-14 overflow-hidden rounded-full bg-border">
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-[var(--dur-slow)]",
                over ? "bg-p2" : "bg-sage",
              )}
              style={{ width: `${Math.min(1, ratio) * 100}%` }}
            />
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-coral">
          <span
            aria-hidden
            className="inline-block size-[5px] rounded-full bg-coral animate-coral-pulse"
          />
          <span className="tabular-nums">{formatDuration(trackedSeconds)}</span>
        </span>
      </span>
    );
  }

  // No estimate: mostra solo total tracked
  if (estimatedMinutes == null || estimatedMinutes <= 0) {
    if (trackedSeconds === 0) return null;
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <span className="font-mono text-[0.5625em] uppercase tracking-[0.16em]">
          done
        </span>
        <span className="tabular-nums">{trackedMin}m</span>
      </span>
    );
  }

  if (trackedSeconds === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <span className="font-mono text-[0.5625em] uppercase tracking-[0.16em]">
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
