"use client";

import { useState, useTransition } from "react";
import { AlignLeft } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { setTaskDescriptionAction } from "@/lib/actions/tasks";
import { Markdown } from "@/lib/utils/markdown";

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

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          autoFocus
          disabled={pending}
          placeholder="Aggiungi una descrizione... (markdown supportato — ⌘↵ per salvare)"
          rows={6}
          className="text-sm"
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

  return (
    <button
      type="button"
      onClick={startEdit}
      className="w-full text-left rounded-md hover:bg-muted/50 px-2 py-1.5 -mx-2 transition-colors"
    >
      {description ? (
        <Markdown source={description} />
      ) : (
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <AlignLeft className="size-4" /> Descrizione
        </span>
      )}
    </button>
  );
}
