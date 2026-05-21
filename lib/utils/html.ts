import DOMPurify from "isomorphic-dompurify";

/**
 * Allowlist allineata a ciò che il rich-text editor (TipTap StarterKit + task
 * list) può produrre. DOMPurify rimuove comunque script, handler inline e
 * protocolli pericolosi: questo set serve a mantenere l'output prevedibile.
 *
 * I tag delle task list (`label`/`input`/`span`/`div` con `data-type`,
 * `data-checked`) sono ammessi così che le checkbox sopravvivano al round-trip
 * salvataggio→render. In sola lettura non sono interattive: il click apre
 * comunque l'editor.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "label",
  "input",
  "span",
  "div",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "type",
  "checked",
  "data-type",
  "data-checked",
];

/** Sanitizza l'HTML del rich-text prima di persistere o renderizzare. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
  });
}

/**
 * Sanitizza l'HTML di una descrizione e restituisce `null` se non resta testo
 * visibile (es. `<p></p>` da un editor vuoto). Punto unico usato dalle action
 * prima di persistere.
 */
export function normalizeDescriptionHtml(
  html: string | null | undefined,
): string | null {
  if (!html) return null;
  const clean = sanitizeHtml(html);
  return htmlToText(clean) ? clean : null;
}

/**
 * Converte l'HTML del rich-text in testo semplice per i consumatori che non
 * renderizzano markup (feed iCal, descrizione eventi Google Calendar).
 * I tag a livello di blocco diventano a-capo così il testo resta leggibile.
 */
export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null;
  const withBreaks = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const text = DOMPurify.sanitize(withBreaks, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}
