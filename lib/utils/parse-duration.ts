export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) minutes = 0;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

export function parseDurationToMinutes(s: string): number | null {
  const normalized = s.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    const n = Number(normalized);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  const colon = normalized.match(/^(\d+):(\d{1,2})$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (Number.isFinite(h) && Number.isFinite(m) && m < 60) return h * 60 + m;
    return null;
  }

  const re = /^(?:(\d+)h)?(?:(\d+)m?)?$/;
  const match = normalized.match(re);
  if (match) {
    const hours = match[1] ? Number(match[1]) : 0;
    const mins = match[2] ? Number(match[2]) : 0;
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
    const total = hours * 60 + mins;
    return total > 0 ? total : null;
  }

  return null;
}
