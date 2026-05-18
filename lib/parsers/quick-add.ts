/**
 * Quick Add NLP parser.
 *
 * Input esempio:
 *   "Chiamare Mario domani 15:00 #ProjectAcme @urgent p1 60min !cliente:Rossi"
 *
 * Output:
 *   {
 *     title: "Chiamare Mario",
 *     scheduledAt: Date(tomorrow 15:00 in user tz),
 *     priority: "P1",
 *     projectName: "ProjectAcme",
 *     labelNames: ["urgent"],
 *     estimatedMinutes: 60,
 *     clientName: "Rossi",
 *   }
 *
 * Tokens supportati:
 *   #NAME       → projectName  (uno solo: l'ultimo vince)
 *   @NAME       → labelNames   (multipli)
 *   p1..p4      → priority     (case-insensitive, l'ultimo vince)
 *   !cliente:NAME | !client:NAME → clientName
 *   60min | 60mins | 60m        → estimatedMinutes
 *   1h | 1h30 | 1h30m           → estimatedMinutes (con ore)
 *   chrono-node: domani 15:00, "tomorrow at 3pm", ecc.
 *
 * Tutto il resto, dopo aver tolto i token, e' il title.
 */

import * as chrono from "chrono-node";

export type Priority = "P1" | "P2" | "P3" | "P4";

export type ParsedQuickAdd = {
  title: string;
  scheduledAt: Date | null;
  priority: Priority;
  projectName: string | null;
  labelNames: string[];
  estimatedMinutes: number | null;
  clientName: string | null;
};

const NAME_RE = /[\p{L}\p{N}_-]+/u;

function extractProject(text: string): { value: string | null; rest: string } {
  const re = new RegExp(`(?:^|\\s)#(${NAME_RE.source})`, "gu");
  let last: string | null = null;
  const rest = text.replace(re, (_full, name) => {
    last = name;
    return " ";
  });
  return { value: last, rest };
}

function extractLabels(text: string): { values: string[]; rest: string } {
  const re = new RegExp(`(?:^|\\s)@(${NAME_RE.source})`, "gu");
  const labels: string[] = [];
  const rest = text.replace(re, (_full, name) => {
    labels.push(name);
    return " ";
  });
  return { values: labels, rest };
}

function extractPriority(text: string): { value: Priority; rest: string } {
  const re = /(^|\s)p([1-4])(?=\s|$)/gi;
  let last: Priority = "P4";
  const rest = text.replace(re, (_full, lead, digit: string) => {
    last = `P${digit}` as Priority;
    return lead;
  });
  return { value: last, rest };
}

function extractClient(text: string): { value: string | null; rest: string } {
  const re = new RegExp(`(?:^|\\s)!(?:cliente|client):(${NAME_RE.source})`, "giu");
  let last: string | null = null;
  const rest = text.replace(re, (_full, name) => {
    last = name;
    return " ";
  });
  return { value: last, rest };
}

function extractDuration(text: string): { minutes: number | null; rest: string } {
  // Ordine: piu' specifici prima
  // 1) 1h30m, 1h30
  const hmRe = /\b(\d+)h(\d+)m?\b/i;
  const hmMatch = text.match(hmRe);
  if (hmMatch) {
    const h = parseInt(hmMatch[1] ?? "0", 10);
    const m = parseInt(hmMatch[2] ?? "0", 10);
    return { minutes: h * 60 + m, rest: text.replace(hmRe, " ") };
  }
  // 2) 1h (solo ore)
  const hRe = /\b(\d+)h\b/i;
  const hMatch = text.match(hRe);
  if (hMatch) {
    const h = parseInt(hMatch[1] ?? "0", 10);
    return { minutes: h * 60, rest: text.replace(hRe, " ") };
  }
  // 3) 60min, 60mins, 60m (con suffisso esplicito)
  const minRe = /\b(\d+)(?:mins?|m)\b/i;
  const minMatch = text.match(minRe);
  if (minMatch) {
    const mins = parseInt(minMatch[1] ?? "0", 10);
    return { minutes: mins, rest: text.replace(minRe, " ") };
  }
  return { minutes: null, rest: text };
}

function extractDate(
  text: string,
  refDate: Date,
): { date: Date | null; rest: string } {
  const results = chrono.parse(text, refDate, { forwardDate: true });
  if (results.length === 0) return { date: null, rest: text };
  const r = results[0];
  if (!r) return { date: null, rest: text };
  const date = r.start.date();
  const before = text.slice(0, r.index);
  const after = text.slice(r.index + r.text.length);
  return { date, rest: `${before} ${after}` };
}

function cleanWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function parseQuickAdd(
  input: string,
  options: { now?: Date } = {},
): ParsedQuickAdd {
  const now = options.now ?? new Date();

  let working = input;

  const proj = extractProject(working);
  working = proj.rest;

  const labels = extractLabels(working);
  working = labels.rest;

  const client = extractClient(working);
  working = client.rest;

  const prio = extractPriority(working);
  working = prio.rest;

  const dur = extractDuration(working);
  working = dur.rest;

  const date = extractDate(working, now);
  working = date.rest;

  const title = cleanWhitespace(working);

  return {
    title,
    scheduledAt: date.date,
    priority: prio.value,
    projectName: proj.value,
    labelNames: labels.values,
    estimatedMinutes: dur.minutes,
    clientName: client.value,
  };
}
