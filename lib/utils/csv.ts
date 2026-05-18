/**
 * Minimale RFC 4180 CSV writer.
 *
 * - Cella con `,`, `"`, `\r`, `\n` → inquotata
 * - `"` interno → raddoppiato `""`
 * - Newline tra righe = CRLF (RFC compliant)
 * - Output con BOM UTF-8 per compat Excel su Windows
 */

const CRLF = "\r\n";
const BOM = "﻿";

function escapeCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined | Date | boolean)[][],
): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(
      row
        .map((cell) =>
          cell instanceof Date ? escapeCell(cell.toISOString()) : escapeCell(cell),
        )
        .join(","),
    );
  }
  return BOM + lines.join(CRLF) + CRLF;
}
