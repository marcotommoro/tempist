"use client";

import { useState, useTransition } from "react";
import { AlignLeft, Pencil } from "lucide-react";

import { DescriptionEditor } from "@/components/features/tasks/description-editor";
import { setTaskDescriptionAction } from "@/lib/actions/tasks";
import { Markdown } from "@/lib/utils/markdown";
import { toggleTaskListItem } from "@/lib/utils/markdown-tasklist";

export function TaskDescriptionEditor({
  taskId,
  initialDescription,
}: {
  taskId: string;
  initialDescription: string | null;
}) {
  const [description, setDescription] = useState<string>(initialDescription ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(description);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(description);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    setError(null);
    const next = draft.trim();
    startTransition(async () => {
      const res = await setTaskDescriptionAction(taskId, next ? next : null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDescription(next);
      setEditing(false);
    });
  }

  // Spunta/de-spunta una checkbox dalla vista di lettura: aggiorna in modo
  // ottimistico e persiste. Su errore ripristina lo stato precedente.
  function onToggle(index: number) {
    const prev = description;
    const next = toggleTaskListItem(description, index);
    setDescription(next);
    setError(null);
    startTransition(async () => {
      const res = await setTaskDescriptionAction(taskId, next ? next : null);
      if (!res.ok) {
        setDescription(prev);
        setError(res.error);
      }
    });
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <DescriptionEditor
          variant="inline"
          value={draft}
          onChange={setDraft}
          disabled={pending}
          autoFocus
          placeholder="Aggiungi una descrizione... (markdown supportato — ⌘↵ per salvare)"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Salva
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground"
          >
            Annulla
          </button>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </div>
    );
  }

  if (!description) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="w-full text-left rounded-md hover:bg-muted/50 px-2 py-1.5 -mx-2 transition-colors"
      >
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <AlignLeft className="size-4" /> Descrizione
        </span>
      </button>
    );
  }

  // Con descrizione: i checkbox sono cliccabili, quindi NON avvolgiamo tutto in
  // un <button> (input dentro button è HTML non valido). La modifica si apre con
  // un pulsante dedicato che appare in hover.
  return (
    <div className="group relative rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50">
      <Markdown source={description} interactive onToggleCheckbox={onToggle} />
      <button
        type="button"
        onClick={startEdit}
        aria-label="Modifica descrizione"
        className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100"
      >
        <Pencil className="size-3.5" />
      </button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
