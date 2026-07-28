import { formatDuration } from "@/lib/utils/format-duration";

/**
 * Tempo tracciato su un task.
 *
 * Quando `live` è true il task ha un timer in corso: mostriamo la durata che
 * scorre (HH:MM:SS, pulse coral) come in header/time-entries. `trackedSeconds`
 * include già il delta live.
 */
export function TaskProgress({
  trackedSeconds,
  live = false,
}: {
  trackedSeconds: number;
  live?: boolean;
}) {
  if (live) {
    return (
      <span className="inline-flex items-center gap-1 text-coral">
        <span
          aria-hidden
          className="inline-block size-[5px] rounded-full bg-coral animate-coral-pulse"
        />
        <span className="tabular-nums">{formatDuration(trackedSeconds)}</span>
      </span>
    );
  }

  if (trackedSeconds === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span className="font-mono text-[0.5625em] uppercase tracking-[0.16em]">
        done
      </span>
      <span className="tabular-nums">{Math.round(trackedSeconds / 60)}m</span>
    </span>
  );
}
