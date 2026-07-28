"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from "react";
import { Calendar, Hash, Plus, Repeat, Tag, User } from "lucide-react";
import { format } from "date-fns";

import { createTaskFromQuickAddAction } from "@/lib/actions/quick-add";
import { parseQuickAdd } from "@/lib/parsers/quick-add";
import { cn } from "@/lib/utils";
import {
  findFreeTextMatch,
  matchByName,
  normalizeName,
} from "@/lib/utils/fuzzy-match";
import { DescriptionEditor } from "./description-editor";
import { QuickAddPickers, type PickItem } from "./quick-add-panel";

/**
 * QuickAdd v2 — NLP parsing + live preview chips.
 *
 * Token supportati (vedi lib/parsers/quick-add.ts):
 *   #project   @label   p1..p4   !cliente:Nome   60min / 1h / 1h30m
 *   chrono-node: "tomorrow at 3pm", "domani 15:00", "next monday", ecc.
 */
export function QuickAddForm({
  defaultScheduledAt,
  defaultProjectId = null,
  defaultSectionId = null,
  defaultClientId = null,
  timezone = "Europe/Rome",
  projects = [],
  clients = [],
  autoFocus = false,
  onCreated,
}: {
  defaultScheduledAt?: Date;
  defaultProjectId?: string | null;
  defaultSectionId?: string | null;
  defaultClientId?: string | null;
  timezone?: string;
  projects?: PickItem[];
  clients?: PickItem[];
  autoFocus?: boolean;
  /** Chiamato dopo una creazione riuscita (es. per chiudere il dialog). */
  onCreated?: () => void;
}) {
  const [input, setInput] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId);
  const [clientId, setClientId] = useState<string | null>(defaultClientId);
  const [expanded, setExpanded] = useState(autoFocus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus all'apertura (dialog): focus sul campo titolo.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    return parseQuickAdd(input, { timezone });
  }, [input, timezone]);

  // Match fuzzy lato client per la preview live del picker: stessa logica del
  // server action (token > free-text). Solo display, il server rifà il match
  // su dati freschi.
  const autoMatch = useMemo<{
    project: PickItem | null;
    client: PickItem | null;
    /** Token (normalizzati) del titolo che hanno triggerato il free-text match. */
    freeTextTokens: Set<string>;
  }>(() => {
    if (!parsed) {
      return { project: null, client: null, freeTextTokens: new Set() };
    }
    const projectFromToken = parsed.projectName
      ? matchByName(parsed.projectName, projects)
      : null;
    const projectFromText = projectFromToken
      ? null
      : findFreeTextMatch(parsed.title, projects);
    const clientFromToken = parsed.clientName
      ? matchByName(parsed.clientName, clients)
      : null;
    const clientFromText = clientFromToken
      ? null
      : findFreeTextMatch(parsed.title, clients);

    const freeTextTokens = new Set<string>();
    if (projectFromText) for (const t of projectFromText.matchedTokens) freeTextTokens.add(t);
    if (clientFromText) for (const t of clientFromText.matchedTokens) freeTextTokens.add(t);

    return {
      project: projectFromToken ?? projectFromText?.item ?? null,
      client: clientFromToken ?? clientFromText?.item ?? null,
      freeTextTokens,
    };
  }, [parsed, projects, clients]);

  // Segmenti del testo da evidenziare nel campo input (data + free-text match).
  const highlightSegments = useMemo<HighlightSegment[]>(() => {
    if (!input || !parsed) return [];
    const segs: HighlightSegment[] = [];
    if (parsed.dateSourceText) {
      const idx = input.toLowerCase().indexOf(parsed.dateSourceText.toLowerCase());
      if (idx >= 0) {
        segs.push({
          start: idx,
          end: idx + parsed.dateSourceText.length,
          kind: "date",
        });
      }
    }
    if (autoMatch.freeTextTokens.size > 0) {
      const wordRe = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = wordRe.exec(input)) !== null) {
        const word = m[0];
        const normalized = normalizeName(word);
        const fullMatch = [...normalized].some((t) =>
          autoMatch.freeTextTokens.has(t),
        );
        if (!fullMatch) continue;
        // Determina se è cliente o progetto (basandosi su cosa ha matchato).
        const isClient =
          autoMatch.client &&
          [...normalizeName(autoMatch.client.name)].some((t) => normalized.has(t));
        const isProject =
          autoMatch.project &&
          [...normalizeName(autoMatch.project.name)].some((t) => normalized.has(t));
        const kind: HighlightSegment["kind"] = isClient
          ? "client"
          : isProject
            ? "project"
            : "client"; // fallback
        const color = isClient
          ? (autoMatch.client?.color ?? null)
          : (autoMatch.project?.color ?? null);
        segs.push({
          start: m.index,
          end: m.index + word.length,
          kind,
          color,
        });
      }
    }
    segs.sort((a, b) => a.start - b.start);
    // Rimuovi sovrapposizioni: tieni la prima.
    const merged: HighlightSegment[] = [];
    let lastEnd = -1;
    for (const s of segs) {
      if (s.start < lastEnd) continue;
      merged.push(s);
      lastEnd = s.end;
    }
    // Se due segmenti sono separati solo da whitespace, le shadow laterali si
    // sovrappongono sullo spazio: marca i lati "adiacenti" per togliere il pad.
    for (let i = 0; i < merged.length; i++) {
      const cur = merged[i]!;
      const prev = merged[i - 1];
      const next = merged[i + 1];
      cur.padLeft =
        !prev || !/^\s*$/.test(input.slice(prev.end, cur.start));
      cur.padRight =
        !next || !/^\s*$/.test(input.slice(cur.end, next.start));
    }
    return merged;
  }, [input, parsed, autoMatch]);

  const effectiveScheduledAt =
    parsed?.scheduledAt ?? defaultScheduledAt ?? null;

  function resetFields() {
    setInput("");
    setDescription("");
    setProjectId(defaultProjectId);
    setClientId(defaultClientId);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      let finalInput = trimmed;
      if (!parsed?.scheduledAt && defaultScheduledAt) {
        finalInput = `${trimmed} ${defaultScheduledAt.toISOString()}`;
      }
      fd.set("input", finalInput);
      if (description.trim()) fd.set("descriptionMarkdown", description.trim());
      // La selezione esplicita vince sul token: la mandiamo solo se presente.
      if (projectId) fd.set("projectId", projectId);
      if (clientId) fd.set("clientId", clientId);
      // La sezione vale solo se il progetto è ancora quello di contesto:
      // cambiando progetto la sezione non appartiene più al task.
      if (defaultSectionId && projectId && projectId === defaultProjectId) {
        fd.set("sectionId", defaultSectionId);
      }
      const res = await createTaskFromQuickAddAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      resetFields();
      // Resta espanso per l'inserimento rapido del task successivo.
      inputRef.current?.focus();
      onCreated?.();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="group flex items-center gap-2 rounded-md border border-input bg-card/40 px-2 py-1 transition-colors focus-within:border-coral/40 focus-within:bg-card focus-within:ring-2 focus-within:ring-ring/30">
        <Plus className="ml-1 size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-coral" />
        <HighlightedInput
          inputRef={inputRef}
          value={input}
          onChange={setInput}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (
              e.key === "Escape" &&
              !input.trim() &&
              !description.trim() &&
              !projectId &&
              !clientId
            ) {
              setExpanded(false);
              inputRef.current?.blur();
            }
          }}
          disabled={pending}
          placeholder='Aggiungi un task…  "Chiamare Mario domani 15:00 #Acme p1"'
          segments={highlightSegments}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="inline-flex h-7 items-center gap-1.5 rounded bg-foreground px-2.5 font-mono text-[0.625em] uppercase tracking-wider text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {parsed && (
        <ParsedPreview
          title={parsed.title}
          scheduledAt={effectiveScheduledAt}
          priority={parsed.priority}
          projectName={parsed.projectName}
          matchedProject={autoMatch.project}
          labelNames={parsed.labelNames}
          clientName={parsed.clientName}
          matchedClient={autoMatch.client}
          recurrenceRule={parsed.recurrenceRule}
        />
      )}

      {expanded && (
        <div className="space-y-2 rounded-md border border-border/60 bg-card/30 p-2">
          <DescriptionEditor
            value={description}
            onChange={setDescription}
            disabled={pending}
            size="compact"
            maxLength={20_000}
          />
          <QuickAddPickers
            projects={projects}
            clients={clients}
            selectedProjectId={projectId}
            selectedClientId={clientId}
            onSelectProject={setProjectId}
            onSelectClient={setClientId}
            tokenProjectName={parsed?.projectName ?? null}
            tokenClientName={parsed?.clientName ?? null}
            autoMatchedProjectId={autoMatch.project?.id ?? null}
            autoMatchedClientId={autoMatch.client?.id ?? null}
            disabled={pending}
          />
        </div>
      )}

      {error && <p className="font-mono text-[0.6875em] text-destructive">{error}</p>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Input con highlight inline
// ---------------------------------------------------------------------------

type HighlightSegment = {
  start: number;
  end: number;
  kind: "date" | "client" | "project";
  /** Colore hex sorgente dell'item (per client/project); ignorato per date. */
  color?: string | null;
  /** False quando il segmento confina (solo whitespace) con un altro: niente shadow su quel lato. */
  padLeft?: boolean;
  padRight?: boolean;
};

/** Tipografia condivisa input + overlay (il caret segue l'input). */
const QUICK_ADD_INPUT_TEXT =
  "min-h-[2.125rem] w-full appearance-none py-1.5 text-[0.875em] leading-5";

function HighlightedInput({
  inputRef,
  value,
  onChange,
  onFocus,
  onKeyDown,
  disabled,
  placeholder,
  segments,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  onFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  placeholder: string;
  segments: HighlightSegment[];
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sincronizza scrollLeft dell'overlay con l'input (per testi più lunghi del campo).
  useEffect(() => {
    const input = inputRef.current;
    const overlay = overlayRef.current;
    if (!input || !overlay) return;
    const sync = () => {
      overlay.scrollLeft = input.scrollLeft;
    };
    sync();
    input.addEventListener("scroll", sync);
    return () => input.removeEventListener("scroll", sync);
  }, [inputRef, value, segments]);

  const pieces = useMemo(() => splitWithSegments(value, segments), [value, segments]);
  const hasHighlights = segments.length > 0;

  return (
    <div className="relative flex-1 overflow-hidden">
      {hasHighlights && (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre text-foreground",
            QUICK_ADD_INPUT_TEXT,
          )}
        >
          {pieces.map((p, i) =>
            p.segment ? (
              <span
                key={i}
                className={cn(
                  "align-baseline",
                  p.segment.kind === "date" && "text-coral",
                )}
                style={
                  p.segment.kind === "date"
                    ? dateTokenHighlightStyle({
                        padLeft: p.segment.padLeft !== false,
                        padRight: p.segment.padRight !== false,
                      })
                    : p.segment.color
                      ? {
                          ...inlineItemTokenHighlightStyle(p.segment.color, {
                            padLeft: p.segment.padLeft !== false,
                            padRight: p.segment.padRight !== false,
                          }),
                          color: p.segment.color,
                        }
                      : undefined
                }
              >
                {p.text}
              </span>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "relative bg-transparent outline-none placeholder:text-muted-foreground disabled:opacity-50",
          QUICK_ADD_INPUT_TEXT,
          hasHighlights && "text-transparent caret-foreground selection:bg-coral/30",
        )}
      />
    </div>
  );
}

function splitWithSegments(
  value: string,
  segments: HighlightSegment[],
): { text: string; segment: HighlightSegment | null }[] {
  if (segments.length === 0) return [{ text: value, segment: null }];
  const out: { text: string; segment: HighlightSegment | null }[] = [];
  let cursor = 0;
  for (const seg of segments) {
    if (seg.start > cursor) {
      out.push({ text: value.slice(cursor, seg.start), segment: null });
    }
    out.push({ text: value.slice(seg.start, seg.end), segment: seg });
    cursor = seg.end;
  }
  if (cursor < value.length) {
    out.push({ text: value.slice(cursor), segment: null });
  }
  return out;
}

/** Padding visivo via box-shadow: non allarga la riga né si sovrappone tra token adiacenti. */
function tokenHighlightPads(
  backgroundColor: string,
  opts: { padLeft?: boolean; padRight?: boolean; insetBorder?: string } = {},
): CSSProperties {
  const { padLeft = true, padRight = true, insetBorder } = opts;
  const x = "0.375rem";
  const y = "0.125rem";
  const shadows: string[] = [];
  if (padLeft) {
    shadows.push(`-${x} -${y} 0 0 ${backgroundColor}`);
    shadows.push(`-${x} ${y} 0 0 ${backgroundColor}`);
  }
  if (padRight) {
    shadows.push(`${x} -${y} 0 0 ${backgroundColor}`);
    shadows.push(`${x} ${y} 0 0 ${backgroundColor}`);
  }
  // Verticale (sempre presente, sopra il testo) per evitare buchi quando un lato è senza pad orizzontale.
  shadows.push(`0 -${y} 0 0 ${backgroundColor}`);
  shadows.push(`0 ${y} 0 0 ${backgroundColor}`);
  if (insetBorder) shadows.push(`inset 0 0 0 1px ${insetBorder}`);
  return {
    backgroundColor,
    boxShadow: shadows.join(", "),
    borderRadius: "0.125rem",
  };
}

// Colori "solidi" (mescolati con la superficie, non con `transparent`): i 6
// box-shadow di `tokenHighlightPads` si sovrappongono ai bordi e con colori
// translucenti l'alpha si somma → centro più chiaro dei bordi. Mescolando con
// `var(--card)` ogni layer è opaco e la sovrapposizione resta uniforme.
function dateTokenHighlightStyle(
  opts: { padLeft?: boolean; padRight?: boolean } = {},
): CSSProperties {
  const bg = "color-mix(in oklab, var(--coral) 15%, var(--card))";
  return tokenHighlightPads(bg, opts);
}

function inlineItemTokenHighlightStyle(
  color: string,
  opts: { padLeft?: boolean; padRight?: boolean } = {},
): CSSProperties {
  const bg = `color-mix(in oklab, ${color} 22%, var(--card))`;
  return tokenHighlightPads(bg, opts);
}

function itemHighlightStyle(color: string): CSSProperties {
  return {
    backgroundColor: `color-mix(in oklab, ${color} 22%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 40%, transparent)`,
  };
}

const PRIORITY_CHIP: Record<string, string> = {
  P1: "border-p1/30 bg-p1/10 text-p1",
  P2: "border-p2/30 bg-p2/10 text-p2",
  P3: "border-p3/30 bg-p3/10 text-p3",
  P4: "border-border bg-muted text-muted-foreground",
};

function Chip({
  icon,
  children,
  className = "",
  style,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[0.625em] tabular-nums",
        className,
      )}
      style={style}
    >
      {icon ? <span className="opacity-70">{icon}</span> : null}
      {children}
    </span>
  );
}

export function ParsedPreview(props: {
  title: string;
  scheduledAt: Date | null;
  priority: "P1" | "P2" | "P3" | "P4";
  projectName: string | null;
  matchedProject?: PickItem | null;
  labelNames: string[];
  clientName: string | null;
  matchedClient?: PickItem | null;
  recurrenceRule: string | null;
}) {
  const projectDisplay = props.matchedProject?.name ?? props.projectName;
  const clientDisplay = props.matchedClient?.name ?? props.clientName;
  const hasAnyToken =
    props.scheduledAt ||
    props.priority !== "P4" ||
    projectDisplay ||
    props.labelNames.length > 0 ||
    clientDisplay ||
    props.recurrenceRule;

  if (!hasAnyToken) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 px-1">
      {props.scheduledAt && (
        <Chip
          icon={<Calendar className="size-2.5" />}
          className="border-coral/30 bg-coral/10 text-coral"
        >
          {format(props.scheduledAt, "EEE d LLL HH:mm")}
        </Chip>
      )}
      {props.priority !== "P4" && (
        <Chip className={PRIORITY_CHIP[props.priority] ?? ""}>
          {props.priority}
        </Chip>
      )}
      {projectDisplay && (
        <Chip
          icon={<Hash className="size-2.5" />}
          className={cn(
            "border-border",
            !props.matchedProject?.color && "text-foreground",
          )}
          style={
            props.matchedProject?.color
              ? {
                  ...itemHighlightStyle(props.matchedProject.color),
                  color: props.matchedProject.color,
                }
              : undefined
          }
        >
          {projectDisplay}
        </Chip>
      )}
      {props.labelNames.map((l) => (
        <Chip
          key={l}
          icon={<Tag className="size-2.5" />}
          className="border-sage/30 bg-sage/10 text-sage"
        >
          {l}
        </Chip>
      ))}
      {clientDisplay && (
        <Chip
          icon={<User className="size-2.5" />}
          className={cn(
            "border-border",
            !props.matchedClient?.color && "text-foreground",
          )}
          style={
            props.matchedClient?.color
              ? {
                  ...itemHighlightStyle(props.matchedClient.color),
                  color: props.matchedClient.color,
                }
              : undefined
          }
        >
          {clientDisplay}
        </Chip>
      )}
      {props.recurrenceRule && (
        <Chip icon={<Repeat className="size-2.5" />} className="border-border bg-muted text-muted-foreground normal-case">
          {props.recurrenceRule}
        </Chip>
      )}
    </div>
  );
}
