"use client";

import { useState, useTransition } from "react";
import { AlignLeft } from "lucide-react";

import {
  DescriptionEditor,
  RichTextContent,
} from "@/components/features/tasks/description-editor";
import { setTaskDescriptionAction } from "@/lib/actions/tasks";

/** Un doc TipTap vuoto serializza come `<p></p>`: lo trattiamo come "nessuna descrizione". */
function isEmptyHtml(html: string): boolean {
  const t = html.trim();
  return t === "" || t === "<p></p>";
}

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
    const next = isEmptyHtml(draft) ? "" : draft;
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

  if (editing) {
    return (
      <div className="space-y-2">
        <DescriptionEditor
          value={draft}
          onChange={setDraft}
          disabled={pending}
          autoFocus
          placeholder="Aggiungi una descrizione… (⌘↵ per salvare, Esc per annullare)"
          onSubmit={save}
          onCancel={cancel}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Salva
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Annulla
          </button>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </div>
    );
  }

  if (isEmptyHtml(description)) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="-mx-2 w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
      >
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <AlignLeft className="size-4" /> Descrizione
        </span>
      </button>
    );
  }

  // Click in qualunque punto della descrizione → apre l'editor. Usiamo un div
  // con role=button (non un <button>) perché il renderer contiene markup di
  // blocco (liste, checkbox) non valido dentro un elemento interattivo.
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={startEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startEdit();
          }
        }}
        aria-label="Modifica descrizione"
        className="-mx-2 block w-full cursor-text rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
      >
        <RichTextContent html={description} />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
