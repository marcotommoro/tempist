"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { createTaskAction } from "@/lib/actions/tasks";

/**
 * Mini-form per aggiungere un task in un giorno specifico.
 * scheduledAt = giorno alle 09:00 locali per default.
 */
export function AddTaskForDay({ day }: { day: Date }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    const dt = new Date(day);
    dt.setHours(9, 0, 0, 0);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", trimmed);
      fd.set("scheduledAt", dt.toISOString());
      const res = await createTaskAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:underline px-3 py-1"
      >
        <Plus className="size-3.5" /> Aggiungi attività
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 px-3 py-1">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        disabled={pending}
        placeholder="Titolo attività..."
        className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        Aggiungi
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setTitle("");
        }}
        disabled={pending}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Annulla
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
