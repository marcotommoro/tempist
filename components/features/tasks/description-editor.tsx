"use client";

import { useRef, type KeyboardEvent } from "react";
import { List, ListTodo } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/lib/utils/markdown";
import { toggleTaskListItem } from "@/lib/utils/markdown-tasklist";
import { cn } from "@/lib/utils";

/**
 * Editor descrizione "rich-text" leggero, basato su Markdown + task list GFM.
 * Niente WYSIWYG: si scrive markdown (o si usano i bottoni della toolbar) e
 * l'anteprima mostra le checkbox cliccabili.
 *
 * `value` è controllato dal parent: sia le modifiche da tastiera sia il toggle
 * di una checkbox passano da `onChange`.
 *
 * - variant "compose": toolbar + textarea + anteprima interattiva (quick-add,
 *   add-task-to-*). L'anteprima compare quando c'è del testo.
 * - variant "inline": toolbar + textarea (il TaskDescriptionEditor gestisce la
 *   vista di sola lettura separatamente).
 */
export function DescriptionEditor({
  value,
  onChange,
  placeholder = "Descrizione (markdown · «- [ ]» per le checkbox)…",
  disabled = false,
  variant = "compose",
  autoFocus = false,
  onKeyDown,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  variant?: "compose" | "inline";
  autoFocus?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insertAtCaret(snippet: string) {
    const ta = ref.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    // Lo snippet va su una nuova riga se non siamo già a inizio riga.
    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const text = prefix + snippet;
    onChange(before + text + after);
    const caret = before.length + text.length;
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <ToolbarButton
          label="Checkbox"
          disabled={disabled}
          onClick={() => insertAtCaret("- [ ] ")}
        >
          <ListTodo className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista"
          disabled={disabled}
          onClick={() => insertAtCaret("- ")}
        >
          <List className="size-3.5" />
        </ToolbarButton>
      </div>

      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        rows={variant === "inline" ? 6 : 3}
        className="text-sm"
      />

      {variant === "compose" && value.trim() && (
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          <Markdown
            source={value}
            interactive
            onToggleCheckbox={(i) => onChange(toggleTaskListItem(value, i))}
          />
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded border border-border bg-card/40 px-1.5",
        "font-mono text-[0.625em] uppercase tracking-wider text-muted-foreground",
        "transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
      )}
    >
      {children}
      {label}
    </button>
  );
}
