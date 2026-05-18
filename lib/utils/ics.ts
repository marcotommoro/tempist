/**
 * iCalendar (RFC 5545) generator — minimal, read-only.
 *
 * Genera un VCALENDAR con un VEVENT per ogni task con scheduledAt.
 * Niente sync inverso, niente RRULE expansion (le ricorrenze vengono spawned
 * dal toggleTaskComplete; ogni occurrence è già un task separato in DB).
 */

const CRLF = "\r\n";

/** Escape valore VCALENDAR per testo: backslash, virgola, semicolon, newline */
function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Formato DTSTART/DTEND UTC: YYYYMMDDTHHMMSSZ */
function formatUtcStamp(d: Date): string {
  const iso = d.toISOString();
  // 2026-05-20T10:30:00.000Z → 20260520T103000Z
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Fold lines > 75 octets (per RFC; il client le concatena) */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += 75) {
    chunks.push(line.slice(i, i + 75));
  }
  return chunks.join(`${CRLF} `);
}

export type IcsEventInput = {
  uid: string;
  summary: string;
  description?: string | null;
  start: Date;
  /** Se omesso: end = start + 1h (event "fittizio" di un'ora) */
  end?: Date | null;
  /** Per LAST-MODIFIED */
  lastModified: Date;
  /** Se completato → STATUS:COMPLETED */
  completedAt?: Date | null;
};

export type IcsCalendarInput = {
  prodId: string;
  events: IcsEventInput[];
};

export function buildIcs(input: IcsCalendarInput): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${input.prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const e of input.events) {
    const end = e.end ?? new Date(e.start.getTime() + 60 * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${formatUtcStamp(new Date())}`,
      `DTSTART:${formatUtcStamp(e.start)}`,
      `DTEND:${formatUtcStamp(end)}`,
      `SUMMARY:${icsEscape(e.summary)}`,
    );
    if (e.description) {
      lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    }
    if (e.lastModified) {
      lines.push(`LAST-MODIFIED:${formatUtcStamp(e.lastModified)}`);
    }
    if (e.completedAt) {
      lines.push("STATUS:COMPLETED");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join(CRLF) + CRLF;
}
