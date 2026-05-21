"use client";

import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { AlignLeft, Plus } from "lucide-react";

import { createTaskAction } from "@/lib/actions/tasks";
import { parseQuickAdd } from "@/lib/parsers/quick-add";
import { DescriptionEditor } from "./description-editor";
import { ParsedPreview } from "./quick-add";

export function AddTaskToClient({
  clientId,
  timezone = "Europe/Rome",
}: {
  clientId: string;
  timezone?: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const parsed = useMemo(() => {
    if (!title.trim()) return null;
    return parseQuickAdd(title, { timezone });
  }, [title, timezone]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", trimmed);
      fd.set("clientId", clientId);
      if (description.trim()) fd.set("descriptionMarkdown", description.trim());
      const res = await createTaskAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
      setDescription("");
      setShowDescription(false);
      inputRef.current?.focus();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="w-full inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
      >
        <Plus className="size-3.5" /> Aggiungi task
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-1 px-3 py-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (!title.trim() && !showDescription && !pending) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setTitle("");
            }
          }}
          disabled={pending}
          placeholder='Titolo… "domani alle 10" p1 60min'
          autoComplete="off"
          maxLength={500}
          className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
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
          clientName={null}
          recurrenceRule={parsed.recurrenceRule}
        />
      )}
      {showDescription ? (
        <DescriptionEditor
          value={description}
          onChange={setDescription}
          disabled={pending}
        />
      ) : (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowDescription(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <AlignLeft className="size-3.5" /> Descrizione
        </button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
