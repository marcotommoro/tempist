/**
 * Recurrence parser: natural language (it/en) → RRULE iCal string.
 *
 * Supportato (MVP):
 *   "daily" / "every day" / "ogni giorno"               → FREQ=DAILY
 *   "weekly" / "every week" / "ogni settimana"          → FREQ=WEEKLY
 *   "monthly" / "every month" / "ogni mese"             → FREQ=MONTHLY
 *   "yearly" / "every year" / "ogni anno"               → FREQ=YEARLY
 *   "every monday" / "ogni lunedì"                      → FREQ=WEEKLY;BYDAY=MO
 *   "every weekday" / "ogni giorno lavorativo"          → FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
 *
 * Per casi piu' complessi (every 2 weeks, until X, etc.) → l'utente passa l'RRULE
 * esplicito (parseRecurrence ritorna null e la chiamante usa la stringa as-is).
 */

import { RRule } from "rrule";

const DAY_MAP: Record<string, string> = {
  // english
  monday: "MO",
  tuesday: "TU",
  wednesday: "WE",
  thursday: "TH",
  friday: "FR",
  saturday: "SA",
  sunday: "SU",
  // italian
  lunedi: "MO",
  martedi: "TU",
  mercoledi: "WE",
  giovedi: "TH",
  venerdi: "FR",
  sabato: "SA",
  domenica: "SU",
};

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "") // strip accents (lunedì → lunedi)
    .trim();
}

/**
 * Ritorna una RRULE string se l'input matcha una keyword nota, null altrimenti.
 * Se l'input e' gia' una RRULE valida (inizia con "FREQ=" o "RRULE:"), la ritorna ripulita.
 */
export function parseRecurrence(input: string): string | null {
  if (!input) return null;
  const raw = input.trim();
  // Pass-through RRULE string
  if (/^(rrule:)?freq=/i.test(raw)) {
    return raw.replace(/^rrule:/i, "");
  }

  const n = normalize(raw);

  // Frequenze base
  if (/^(daily|every\s+day|ogni\s+giorno)$/.test(n)) return "FREQ=DAILY";
  if (/^(weekly|every\s+week|ogni\s+settimana)$/.test(n)) return "FREQ=WEEKLY";
  if (/^(monthly|every\s+month|ogni\s+mese)$/.test(n)) return "FREQ=MONTHLY";
  if (/^(yearly|annually|every\s+year|ogni\s+anno)$/.test(n)) return "FREQ=YEARLY";

  // Weekday-only
  if (/^(every\s+weekday|ogni\s+giorno\s+lavorativo)$/.test(n)) {
    return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
  }

  // Every <dayname>
  const dayMatch = n.match(/^(?:every|ogni)\s+([a-z]+)$/);
  if (dayMatch && dayMatch[1]) {
    const code = DAY_MAP[dayMatch[1]];
    if (code) return `FREQ=WEEKLY;BYDAY=${code}`;
  }

  return null;
}

/**
 * Dato un RRULE e una data di riferimento (la scheduledAt corrente),
 * ritorna la prossima occorrenza STRETTAMENTE dopo refDate.
 *
 * Forza `dtstart = refDate` cosi' la prossima occorrenza e' relativa a refDate
 * (es. FREQ=WEEKLY da venerdi' → venerdi' successivo, non lunedi' arbitrario).
 */
export function computeNextOccurrence(
  rruleString: string,
  refDate: Date,
): Date | null {
  try {
    const clean = rruleString.replace(/^RRULE:/i, "");
    const opts = RRule.parseString(clean);
    opts.dtstart = refDate;
    const rule = new RRule(opts);
    const next = rule.after(refDate, false);
    return next ?? null;
  } catch {
    return null;
  }
}
