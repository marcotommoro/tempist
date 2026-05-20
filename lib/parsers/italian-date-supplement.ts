import { addDays, set, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export type ItalianDateMatch = {
  date: Date;
  matchedText: string;
  hasExplicitHour: boolean;
};

const WEEKDAY_INDEX: Record<string, number> = {
  domenica: 0,
  lunedi: 1,
  lunedì: 1,
  martedi: 2,
  martedì: 2,
  mercoledi: 3,
  mercoledì: 3,
  giovedi: 4,
  giovedì: 4,
  venerdi: 5,
  venerdì: 5,
  sabato: 6,
};

const WEEKDAY_IN_NEXT_WEEK_RE =
  /\b(domenica|lunedi|lunedì|martedi|martedì|mercoledi|mercoledì|giovedi|giovedì|venerdi|venerdì|sabato)\s+(?:della\s+)?(?:la\s+)?settimana\s+prossima\b/giu;

const NEXT_WEEK_RE =
  /\b(?:la\s+)?settimana\s+prossima\b/giu;

const DAY_AFTER_TOMORROW_RE =
  /\bdopodomani(?:\s+alle\s+(\d{1,2})(?::(\d{2}))?)?\b/giu;

function mondayOfNextWeekLocal(local: Date): Date {
  const weekStart = startOfWeek(local, { weekStartsOn: 1 });
  const nextMonday = addDays(weekStart, 7);
  return set(nextMonday, {
    hours: 9,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
}

function dayInNextWeekLocal(local: Date, targetDow: number, hour: number, minute: number): Date {
  const monday = mondayOfNextWeekLocal(local);
  const mondayDow = 1;
  let offset = targetDow - mondayDow;
  if (offset < 0) offset += 7;
  const day = addDays(monday, offset);
  return set(day, {
    hours: hour,
    minutes: minute,
    seconds: 0,
    milliseconds: 0,
  });
}

function toUtc(local: Date, timezone: string): Date {
  return fromZonedTime(local, timezone);
}

function pickLeftmost(
  candidates: Array<ItalianDateMatch & { index: number }>,
): ItalianDateMatch | null {
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.index - b.index);
  const best = candidates[0];
  if (!best) return null;
  return {
    date: best.date,
    matchedText: best.matchedText,
    hasExplicitHour: best.hasExplicitHour,
  };
}

export function normalizeItalianDateText(text: string): string {
  return text
    .replace(/\blunedi\b/giu, "lunedì")
    .replace(/\bmartedi\b/giu, "martedì")
    .replace(/\bmercoledi\b/giu, "mercoledì")
    .replace(/\bgiovedi\b/giu, "giovedì")
    .replace(/\bvenerdi\b/giu, "venerdì");
}

export function parseItalianDateSupplement(
  text: string,
  timezone: string,
  now: Date = new Date(),
): ItalianDateMatch | null {
  const local = toZonedTime(now, timezone);
  const candidates: Array<ItalianDateMatch & { index: number }> = [];

  for (const match of text.matchAll(WEEKDAY_IN_NEXT_WEEK_RE)) {
    const rawDay = match[1]?.toLowerCase() ?? "";
    const dayKey = rawDay.normalize("NFD").replace(/\p{M}/gu, "");
    const dow = WEEKDAY_INDEX[rawDay] ?? WEEKDAY_INDEX[dayKey];
    if (dow === undefined || match.index === undefined) continue;
    const atLocal = dayInNextWeekLocal(local, dow, 9, 0);
    candidates.push({
      index: match.index,
      date: toUtc(atLocal, timezone),
      matchedText: match[0],
      hasExplicitHour: false,
    });
  }

  for (const match of text.matchAll(NEXT_WEEK_RE)) {
    if (match.index === undefined) continue;
    const overlapsDayPattern = candidates.some(
      (c) =>
        match.index !== undefined &&
        c.index <= match.index &&
        match.index < c.index + c.matchedText.length,
    );
    if (overlapsDayPattern) continue;
    const atLocal = mondayOfNextWeekLocal(local);
    candidates.push({
      index: match.index,
      date: toUtc(atLocal, timezone),
      matchedText: match[0],
      hasExplicitHour: false,
    });
  }

  for (const match of text.matchAll(DAY_AFTER_TOMORROW_RE)) {
    if (match.index === undefined) continue;
    const hourRaw = match[1];
    const minuteRaw = match[2];
    const hasExplicitHour = hourRaw !== undefined;
    const hour = hasExplicitHour ? parseInt(hourRaw, 10) : 9;
    const minute = minuteRaw ? parseInt(minuteRaw, 10) : 0;
    const dayLocal = addDays(local, 2);
    const atLocal = set(dayLocal, {
      hours: hour,
      minutes: minute,
      seconds: 0,
      milliseconds: 0,
    });
    candidates.push({
      index: match.index,
      date: toUtc(atLocal, timezone),
      matchedText: match[0],
      hasExplicitHour,
    });
  }

  return pickLeftmost(candidates);
}

export function removeMatchedText(text: string, matchedText: string, index: number): string {
  const before = text.slice(0, index);
  const after = text.slice(index + matchedText.length);
  return `${before} ${after}`.replace(/\s+/g, " ").trim();
}
