"use client";

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Calendar, Hash, Plus, Repeat, Tag, Timer, User } from "lucide-react";
import { format } from "date-fns";

import { createTaskFromQuickAddAction } from "@/lib/actions/quick-add";
import { parseQuickAdd } from "@/lib/parsers/quick-add";
import { cn } from "@/lib/utils";
import { DescriptionEditor } from "./description-editor";
import { QuickAddPickers, type PickItem } from "./quick-add-panel";

/**
 * QuickAdd v2 — NLP parsing + live preview chips.
 *
 * Token supportati (vedi lib/parsers/quick-add.ts):
 *   #project   @label   p1..p4   !cliente:Nome   60min / 1h / 1h30m
 *   chrono-node: "tomorrow at 3pm", "domani 15:00", "next monday", ecc.
 */
export function QuickAdd({
  defaultScheduledAt,
  timezone = "Europe/Rome",
  projects = [],
  clients = [],
}: {
  defaultScheduledAt?: Date;
  timezone?: string;
  projects?: PickItem[];
  clients?: PickItem[];
}) {
  const [input, setInput] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    return parseQuickAdd(input, { timezone });
  }, [input, timezone]);

  const effectiveScheduledAt =
    parsed?.scheduledAt ?? defaultScheduledAt ?? null;

  function resetFields() {
    setInput("");
    setDescription("");
    setProjectId(null);
    setClientId(null);
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
      const res = await createTaskFromQuickAddAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      resetFields();
      // Resta espanso per l'inserimento rapido del task successivo.
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="group flex items-center gap-2 rounded-md border border-input bg-card/40 px-2 py-1 transition-colors focus-within:border-coral/40 focus-within:bg-card focus-within:ring-2 focus-within:ring-ring/30">
        <Plus className="ml-1 size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-coral" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
              // Blur così che un nuovo focus riapra il pannello.
              inputRef.current?.blur();
            }
          }}
          disabled={pending}
          placeholder='Aggiungi un task…  "Chiamare Mario domani 15:00 #Acme p1 60min"'
          autoComplete="off"
          className="flex-1 bg-transparent py-1.5 text-[0.875em] outline-none placeholder:text-muted-foreground disabled:opacity-50"
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
          labelNames={parsed.labelNames}
          estimatedMinutes={parsed.estimatedMinutes}
          clientName={parsed.clientName}
          recurrenceRule={parsed.recurrenceRule}
        />
      )}

      {expanded && (
        <div className="space-y-2 rounded-md border border-border/60 bg-card/30 p-2">
          <DescriptionEditor
            value={description}
            onChange={setDescription}
            disabled={pending}
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
            disabled={pending}
          />
        </div>
      )}

      {error && <p className="font-mono text-[0.6875em] text-destructive">{error}</p>}
    </form>
  );
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
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[0.625em] tabular-nums",
        className,
      )}
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
  labelNames: string[];
  estimatedMinutes: number | null;
  clientName: string | null;
  recurrenceRule: string | null;
}) {
  const hasAnyToken =
    props.scheduledAt ||
    props.priority !== "P4" ||
    props.projectName ||
    props.labelNames.length > 0 ||
    props.estimatedMinutes ||
    props.clientName ||
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
      {props.projectName && (
        <Chip icon={<Hash className="size-2.5" />} className="border-border bg-secondary text-foreground">
          {props.projectName}
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
      {props.clientName && (
        <Chip icon={<User className="size-2.5" />} className="border-border bg-secondary text-foreground">
          {props.clientName}
        </Chip>
      )}
      {props.estimatedMinutes != null && (
        <Chip icon={<Timer className="size-2.5" />} className="border-border bg-muted text-muted-foreground">
          {props.estimatedMinutes}m
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
