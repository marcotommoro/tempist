/**
 * Parser CSV minimale RFC 4180-compliant.
 *
 * - Quote: ", raddoppiate dentro "" → "
 * - Separatore: , (configurable)
 * - Line ending: \n o \r\n
 *
 * Per CSV piccoli (< 10k righe). Per più grandi → streaming/papaparse.
 */

export type CsvRow = Record<string, string>;

export function parseCsv(
  input: string,
  opts: { separator?: string } = {},
): { headers: string[]; rows: CsvRow[] } {
  const sep = opts.separator ?? ",";

  // Strip BOM se presente
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const cells: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === sep) {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      cell = "";
      cells.push(row);
      row = [];
      i++;
      continue;
    }
    cell += ch;
    i++;
  }

  // Ultima riga senza newline finale
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    cells.push(row);
  }

  if (cells.length === 0) return { headers: [], rows: [] };

  const headers = (cells[0] ?? []).map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (let r = 1; r < cells.length; r++) {
    const arr = cells[r]!;
    if (arr.length === 1 && arr[0] === "") continue; // skip empty lines
    const obj: CsvRow = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]!] = arr[c] ?? "";
    }
    rows.push(obj);
  }
  return { headers, rows };
}
