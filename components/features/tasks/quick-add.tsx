"use client";

import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";

import { createTaskFromQuickAddAction } from "@/lib/actions/quick-add";
import { parseQuickAdd } from "@/lib/parsers/quick-add";

/**
 * QuickAdd v2 — con NLP parsing + live preview chips.
 *
 * Token supportati (vedi lib/parsers/quick-add.ts):
 *   #project   @label   p1..p4   !cliente:Nome   60min / 1h / 1h30m
 *   chrono-node: "tomorrow at 3pm", "domani 15:00", "next monday", ecc.
 *
 * defaultScheduledAt e' applicato solo se il parser non trova date nel testo.
 */
export function QuickAdd({ defaultScheduledAt }: { defaultScheduledAt?: Date }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    return parseQuickAdd(input);
  }, [input]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      // Se l'utente non ha messo una data esplicita e c'e' un defaultScheduledAt,
      // appendiamo l'ISO al testo cosi' il parser lo pesca come date.
      let finalInput = trimmed;
      if (!parsed?.scheduledAt && defaultScheduledAt) {
        finalInput = `${trimmed} ${defaultScheduledAt.toISOString()}`;
      }
      fd.set("input", finalInput);
      const res = await createTaskFromQuickAddAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInput("");
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
          placeholder='Es: "Chiamare Mario domani 15:00 #Acme @urgent p1 60min"'
          autoComplete="off"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-4" />
          Aggiungi
        </button>
      </div>

      {parsed && (
        <ParsedPreview
          title={parsed.title}
          scheduledAt={parsed.scheduledAt}
          priority={parsed.priority}
          projectName={parsed.projectName}
          labelNames={parsed.labelNames}
          estimatedMinutes={parsed.estimatedMinutes}
          clientName={parsed.clientName}
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

const PRIORITY_CHIP: Record<string, string> = {
  P1: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  P2: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  P3: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  P4: "bg-muted text-muted-foreground",
};

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function ParsedPreview(props: {
  title: string;
  scheduledAt: Date | null;
  priority: "P1" | "P2" | "P3" | "P4";
  projectName: string | null;
  labelNames: string[];
  estimatedMinutes: number | null;
  clientName: string | null;
}) {
  const hasAnyToken =
    props.scheduledAt ||
    props.priority !== "P4" ||
    props.projectName ||
    props.labelNames.length > 0 ||
    props.estimatedMinutes ||
    props.clientName;

  if (!hasAnyToken) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs">
      {props.scheduledAt && (
        <Chip className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">
          📅 {format(props.scheduledAt, "EEE d MMM, HH:mm")}
        </Chip>
      )}
      {props.priority !== "P4" && (
        <Chip className={PRIORITY_CHIP[props.priority] ?? ""}>{props.priority}</Chip>
      )}
      {props.projectName && (
        <Chip className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
          #{props.projectName}
        </Chip>
      )}
      {props.labelNames.map((l) => (
        <Chip
          key={l}
          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
        >
          @{l}
        </Chip>
      ))}
      {props.clientName && (
        <Chip className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          !cliente:{props.clientName}
        </Chip>
      )}
      {props.estimatedMinutes != null && (
        <Chip className="bg-muted text-muted-foreground">
          ⏱ {props.estimatedMinutes}m
        </Chip>
      )}
    </div>
  );
}
