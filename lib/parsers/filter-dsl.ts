/**
 * Filter mini-DSL parser.
 *
 * Sintassi (AND implicito tra termini, MVP semplificato):
 *
 *   priority:P1          → priority esatto
 *   priority:P1,P2       → priority IN (P1, P2)
 *   @labelName           → task con label
 *   due:today            → scheduledAt <= fine giornata
 *   due:overdue          → scheduledAt < inizio giornata
 *   due:7d | due:30d     → entro N giorni
 *   is:open | is:completed
 *   project:Nome         → matcha project_name case-insensitive
 *   client:Nome
 *   parole libere        → ILIKE %parola% sul title
 *
 * Esempio:
 *   "important meeting priority:P1 @urgent due:7d is:open"
 *
 * Output:
 *   ParsedFilter — struttura piatta consumata dall'executor.
 */

export type DueRange =
  | { kind: "today" }
  | { kind: "overdue" }
  | { kind: "withinDays"; days: number };

export type ParsedFilter = {
  priorities: Array<"P1" | "P2" | "P3" | "P4">;
  labelNames: string[];
  projectName: string | null;
  clientName: string | null;
  due: DueRange | null;
  status: "open" | "completed" | "all";
  textQuery: string | null;
};

const TOKEN_RE = /(\S+)/g;

const PRIORITY_RE = /^p[1-4]$/i;
const NAME_PART = "[\\p{L}\\p{N}_-]+";
const LABEL_RE = new RegExp(`^@(${NAME_PART})$`, "u");
const KV_RE = new RegExp(`^([a-z]+):(.+)$`, "iu");

export function parseFilter(input: string): ParsedFilter {
  const out: ParsedFilter = {
    priorities: [],
    labelNames: [],
    projectName: null,
    clientName: null,
    due: null,
    status: "open",
    textQuery: null,
  };

  const free: string[] = [];
  const tokens = input.match(TOKEN_RE) ?? [];

  for (const tok of tokens) {
    // @label
    const labelMatch = tok.match(LABEL_RE);
    if (labelMatch && labelMatch[1]) {
      out.labelNames.push(labelMatch[1]);
      continue;
    }

    // key:value
    const kv = tok.match(KV_RE);
    if (kv) {
      const key = kv[1]!.toLowerCase();
      const value = kv[2]!;
      switch (key) {
        case "priority":
        case "p": {
          for (const part of value.split(",")) {
            const norm = part.trim().toUpperCase();
            if (/^P[1-4]$/.test(norm)) {
              out.priorities.push(norm as "P1" | "P2" | "P3" | "P4");
            }
          }
          continue;
        }
        case "due": {
          out.due = parseDueValue(value);
          continue;
        }
        case "is":
        case "status": {
          const v = value.toLowerCase();
          if (v === "open" || v === "completed" || v === "all") {
            out.status = v;
          }
          continue;
        }
        case "project": {
          out.projectName = value;
          continue;
        }
        case "client":
        case "cliente": {
          out.clientName = value;
          continue;
        }
        // fall-through: chiave sconosciuta → trattata come testo
      }
    }

    // priority shorthand: "p1", "P2"
    if (PRIORITY_RE.test(tok)) {
      out.priorities.push(tok.toUpperCase() as "P1" | "P2" | "P3" | "P4");
      continue;
    }

    // tutto il resto: testo libero
    free.push(tok);
  }

  // Dedup
  out.priorities = Array.from(new Set(out.priorities));
  out.labelNames = Array.from(new Set(out.labelNames));

  if (free.length > 0) out.textQuery = free.join(" ");
  return out;
}

function parseDueValue(value: string): DueRange | null {
  const v = value.toLowerCase();
  if (v === "today") return { kind: "today" };
  if (v === "overdue") return { kind: "overdue" };
  const m = v.match(/^(\d+)d$/);
  if (m && m[1]) {
    const days = parseInt(m[1], 10);
    if (days > 0 && days < 3650) return { kind: "withinDays", days };
  }
  return null;
}
