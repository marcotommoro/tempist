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

import { applyDefaultTaskTime } from "@/lib/utils/apply-default-task-time";
import {
  normalizeItalianDateText,
  parseItalianDateSupplement,
  removeMatchedText,
} from "./italian-date-supplement";
import { parseRecurrence } from "./recurrence";

export type Priority = "P1" | "P2" | "P3" | "P4";

export type ParsedQuickAdd = {
  title: string;
  scheduledAt: Date | null;
  priority: Priority;
  projectName: string | null;
  labelNames: string[];
  estimatedMinutes: number | null;
  clientName: string | null;
  recurrenceRule: string | null;
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

function extractRepeats(text: string): { value: string | null; rest: string } {
  // repeats:VALUE — VALUE puo' contenere spazi se quotato? Per ora prendiamo
  // fino al prossimo token strutturato. Pattern semplice: repeats:WORD(_WORD)*
  // Per supportare "repeats:every monday", richiediamo che VALUE non contenga
  // i marker speciali (#@!).
  const re = /(?:^|\s)repeats:([^\s#@!]+(?:\s+[^\s#@!]+)*?)(?=\s+#|\s+@|\s+!|\s+p[1-4]\b|$)/iu;
  const m = text.match(re);
  if (!m || !m[1]) return { value: null, rest: text };
  const raw = m[1].trim();
  const rrule = parseRecurrence(raw);
  return {
    value: rrule, // null se non parsabile
    rest: text.replace(re, " "),
  };
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

const DEFAULT_TIMEZONE = "Europe/Rome";

function findInsensitiveIndex(text: string, needle: string): number {
  return text.toLowerCase().indexOf(needle.toLowerCase());
}

function removeDateSpan(text: string, matchedText: string, hintIndex?: number): string {
  const index =
    hintIndex !== undefined && hintIndex >= 0
      ? hintIndex
      : findInsensitiveIndex(text, matchedText);
  if (index < 0) {
    return text.replace(new RegExp(escapeRegExp(matchedText), "i"), " ");
  }
  return removeMatchedText(text, matchedText, index);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function finalizeDate(
  date: Date,
  timezone: string,
  hasExplicitHour: boolean,
): Date {
  return hasExplicitHour ? date : applyDefaultTaskTime(date, timezone);
}

function extractDate(
  text: string,
  refDate: Date,
  timezone: string,
): { date: Date | null; rest: string } {
  const normalized = normalizeItalianDateText(text);

  const supplement = parseItalianDateSupplement(normalized, timezone, refDate);
  if (supplement) {
    const date = finalizeDate(
      supplement.date,
      timezone,
      supplement.hasExplicitHour,
    );
    const index = findInsensitiveIndex(text, supplement.matchedText);
    const rest = removeDateSpan(text, supplement.matchedText, index >= 0 ? index : undefined);
    return { date, rest };
  }

  const ref = { instant: refDate, timezone };
  const opts = { forwardDate: true as const };

  const chronoResults = [
    ...chrono.it.parse(normalized, ref, opts),
    ...chrono.en.parse(normalized, ref, opts),
  ];
  if (chronoResults.length === 0) return { date: null, rest: text };

  chronoResults.sort((a, b) => {
    const indexA = a.index ?? 0;
    const indexB = b.index ?? 0;
    if (indexA !== indexB) return indexA - indexB;
    return b.text.length - a.text.length;
  });
  const result = chronoResults[0];
  if (!result) return { date: null, rest: text };

  const hasExplicitHour = result.start.isCertain("hour");
  const date = finalizeDate(result.start.date(), timezone, hasExplicitHour);

  const indexInOriginal = findInsensitiveIndex(text, result.text);
  const rest = removeDateSpan(
    text,
    result.text,
    indexInOriginal >= 0 ? indexInOriginal : result.index,
  );
  return { date, rest };
}

function cleanWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export type ParseQuickAddOptions = {
  now?: Date;
  timezone?: string;
};

export function parseQuickAdd(
  input: string,
  options: ParseQuickAddOptions = {},
): ParsedQuickAdd {
  const now = options.now ?? new Date();
  const timezone = options.timezone ?? DEFAULT_TIMEZONE;

  let working = input;

  const proj = extractProject(working);
  working = proj.rest;

  const labels = extractLabels(working);
  working = labels.rest;

  const client = extractClient(working);
  working = client.rest;

  const repeats = extractRepeats(working);
  working = repeats.rest;

  const prio = extractPriority(working);
  working = prio.rest;

  const dur = extractDuration(working);
  working = dur.rest;

  const date = extractDate(working, now, timezone);
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
    recurrenceRule: repeats.value,
  };
}
