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
    return Number.isFinite(n) && n > 0 ? n * 60 : null;
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

/**
 * Formatta una durata in SECONDI in forma compatta: "5s", "1m30s", "1h30m", "2h5m10s".
 * I secondi compaiono solo quando non sono un multiplo esatto del minuto, così le
 * voci "normali" restano leggibili ("1h30m") ma una voce sub-minuto dice la verità ("5s").
 */
export function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h === 0 && m === 0 && s === 0) return "0s";
  let out = "";
  if (h > 0) out += `${h}h`;
  if (m > 0) out += `${m}m`;
  if (s > 0) out += `${s}s`;
  return out;
}

/**
 * Converte una durata testuale in SECONDI. Convenzioni (allineate al campo "Ore effettive"):
 *   - numero secco ("5")      → ORE   (5 * 3600), come Toggl/Harvest
 *   - "H:MM" / "H:MM:SS"      → ore:minuti(:secondi)
 *   - "1h30"                  → 1h30m (shorthand storico: numero dopo l'ora = minuti)
 *   - suffissi combinabili    → "1h30m5s", "45m", "30s", "1h"
 * Ritorna null se non interpretabile o <= 0.
 */
export function parseDurationToSeconds(s: string): number | null {
  const normalized = s.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) return null;

  // numero secco = ore
  if (/^\d+$/.test(normalized)) {
    const n = Number(normalized);
    return Number.isFinite(n) && n > 0 ? n * 3600 : null;
  }

  // H:MM oppure H:MM:SS
  const colon = normalized.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    const sec = colon[3] != null ? Number(colon[3]) : 0;
    if (m >= 60 || sec >= 60) return null;
    const total = h * 3600 + m * 60 + sec;
    return total > 0 ? total : null;
  }

  // shorthand "1h30" → 1h e 30 minuti
  const hShort = normalized.match(/^(\d+)h(\d+)$/);
  if (hShort) {
    const total = Number(hShort[1]) * 3600 + Number(hShort[2]) * 60;
    return total > 0 ? total : null;
  }

  // suffissi combinabili h/m/s
  const re = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;
  const match = normalized.match(re);
  if (match && (match[1] || match[2] || match[3])) {
    const h = match[1] ? Number(match[1]) : 0;
    const m = match[2] ? Number(match[2]) : 0;
    const sec = match[3] ? Number(match[3]) : 0;
    const total = h * 3600 + m * 60 + sec;
    return total > 0 ? total : null;
  }

  return null;
}
