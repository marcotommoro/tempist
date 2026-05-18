"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { createTaskAction } from "@/lib/actions/tasks";

/**
 * Form minimale per aggiungere un task dentro un project/section specifici.
 * Usa createTaskAction passando projectId/sectionId via formData (no NLP).
 */
export function AddTaskToProject({
  projectId,
  sectionId,
}: {
  projectId: string;
  sectionId?: string | null;
}) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", trimmed);
      fd.set("projectId", projectId);
      if (sectionId) fd.set("sectionId", sectionId);
      const res = await createTaskAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
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
    <form onSubmit={onSubmit} className="px-3 py-2 space-y-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (!title.trim() && !pending) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setTitle("");
            }
          }}
          disabled={pending}
          placeholder="Titolo task..."
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
