/**
 * Formatta una durata in secondi nel formato `HH:MM:SS` o `MM:SS`.
 *
 *   formatDuration(59)    // "00:59"
 *   formatDuration(125)   // "02:05"
 *   formatDuration(3725)  // "01:02:05"
 *   formatDuration(-1)    // "00:00" (negativi clampati a zero)
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) {
    const hh = String(h).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
