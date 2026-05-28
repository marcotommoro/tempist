/**
 * Fuzzy whole-word name matcher per QuickAdd.
 *
 * Due modalità sui un'unica normalizzazione (`normalizeName`):
 *
 *  - `matchByName`        → modalità token (`#Project`, `!cliente:Name`).
 *                            Match richiesto su TUTTE le parole della query.
 *                            Nessun filtro minimo: l'utente ha scritto esplicitamente
 *                            quel nome, anche `#al` vale.
 *
 *  - `findFreeTextMatch`  → scansiona il testo libero del titolo. Match opportunistico:
 *                            in caso di ambiguità ritorna null (nessuna associazione).
 *                            Filtra parole < minWordLength (default 3) e stopword.
 *
 * Normalizzazione `A.L.I.Ce. Italia` → `{a, l, i, ce, italia, alice}` grazie al
 * collapse di run di token corti (≤ 2 char) — necessario per far matchare `alice`.
 */

const DIACRITICS_RE = /[̀-ͯ]/g;
const NON_ALNUM_RE = /[^a-z0-9]+/;
const SHORT_TOKEN_MAX_LEN = 2;

const DEFAULT_STOPWORDS: ReadonlySet<string> = new Set([
  "per",
  "con",
  "del",
  "della",
  "dei",
  "delle",
  "sul",
  "sulla",
  "una",
  "uno",
  "the",
  "and",
  "for",
  "with",
]);

const DEFAULT_MIN_WORD_LENGTH = 3;

export function normalizeName(name: string): Set<string> {
  const stripped = name.normalize("NFD").replace(DIACRITICS_RE, "").toLowerCase();
  const parts = stripped.split(NON_ALNUM_RE).filter((p) => p.length > 0);

  const tokens = new Set<string>(parts);

  // Collapse run di token corti (es. "A.L.I.Ce." → ["a","l","i","ce"] → "alice").
  let runStart = -1;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (p.length <= SHORT_TOKEN_MAX_LEN) {
      if (runStart === -1) runStart = i;
    } else if (runStart !== -1) {
      flushRun(parts, runStart, i, tokens);
      runStart = -1;
    }
  }
  if (runStart !== -1) flushRun(parts, runStart, parts.length, tokens);

  return tokens;
}

function flushRun(
  parts: readonly string[],
  start: number,
  endExclusive: number,
  out: Set<string>,
): void {
  if (endExclusive - start < 2) return;
  let joined = "";
  for (let i = start; i < endExclusive; i++) joined += parts[i]!;
  if (joined.length > 0) out.add(joined);
}

/**
 * Token mode: ogni parola della query deve essere presente come parola intera
 * (dopo normalizzazione) nel nome dell'item. Restituisce l'unico candidato o
 * `null` in caso di 0 o ≥ 2 match.
 */
export function matchByName<T extends { name: string }>(
  query: string,
  items: readonly T[],
): T | null {
  const q = normalizeName(query);
  if (q.size === 0) return null;

  let found: T | null = null;
  for (const item of items) {
    const tokens = normalizeName(item.name);
    let allIn = true;
    for (const word of q) {
      if (!tokens.has(word)) {
        allIn = false;
        break;
      }
    }
    if (!allIn) continue;
    if (found) return null; // ambiguità → silent skip
    found = item;
  }
  return found;
}

export type FindFreeTextMatchOptions = {
  minWordLength?: number;
  stopwords?: ReadonlySet<string>;
};

export type FreeTextMatch<T> = {
  /** Item che ha matchato (unico). */
  item: T;
  /**
   * Token normalizzati del titolo che hanno triggerato il match.
   * Servono per rimuovere o evidenziare quelle parole nell'input originale.
   */
  matchedTokens: Set<string>;
};

/**
 * Free-text mode: scansiona `text` cercando una qualsiasi parola che coincida
 * (whole-word) con una parola del nome dell'item. Filtra parole troppo corte e
 * stopword sia nella query sia nei nomi degli item (così acronimi di un singolo
 * carattere non triggerano su una "a" qualunque del titolo).
 *
 * Ritorna l'unico candidato (con i token che lo hanno triggerato) o `null`
 * (anche in caso di ambiguità).
 */
export function findFreeTextMatch<T extends { name: string }>(
  text: string,
  items: readonly T[],
  opts: FindFreeTextMatchOptions = {},
): FreeTextMatch<T> | null {
  const minLen = opts.minWordLength ?? DEFAULT_MIN_WORD_LENGTH;
  const stopwords = opts.stopwords ?? DEFAULT_STOPWORDS;

  const words = filterTokens(normalizeName(text), minLen, stopwords);
  if (words.size === 0) return null;

  let found: { item: T; tokens: Set<string> } | null = null;
  for (const item of items) {
    const nameTokens = filterTokens(normalizeName(item.name), minLen, stopwords);
    if (nameTokens.size === 0) continue;
    const intersection = new Set<string>();
    for (const t of nameTokens) {
      if (words.has(t)) intersection.add(t);
    }
    if (intersection.size === 0) continue;
    if (found) return null; // ambiguità → no auto-assign
    found = { item, tokens: intersection };
  }
  if (!found) return null;
  return { item: found.item, matchedTokens: found.tokens };
}

/**
 * Rimuove dal `text` ogni parola i cui token normalizzati (post-filtro) sono
 * tutti contenuti in `matchedTokens`. Usato dopo `findFreeTextMatch` per togliere
 * dal titolo il nome del cliente/progetto auto-associato.
 *
 * Esempio: `text = "alice 7 giugno mandare la mail"`, `matchedTokens = {alice}`
 *   → `"7 giugno mandare la mail"` (poi il parser ha già tolto "7 giugno").
 */
export function stripFreeTextMatch(
  text: string,
  matchedTokens: ReadonlySet<string>,
  opts: FindFreeTextMatchOptions = {},
): string {
  if (matchedTokens.size === 0) return text;
  const minLen = opts.minWordLength ?? DEFAULT_MIN_WORD_LENGTH;
  const stopwords = opts.stopwords ?? DEFAULT_STOPWORDS;

  const stripped = text.replace(/\S+/g, (word) => {
    const filtered = filterTokens(normalizeName(word), minLen, stopwords);
    if (filtered.size === 0) return word;
    for (const t of filtered) {
      if (!matchedTokens.has(t)) return word;
    }
    return "";
  });
  return stripped.replace(/\s+/g, " ").trim();
}

function filterTokens(
  tokens: ReadonlySet<string>,
  minLen: number,
  stopwords: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>();
  for (const t of tokens) {
    if (t.length < minLen) continue;
    if (stopwords.has(t)) continue;
    out.add(t);
  }
  return out;
}
