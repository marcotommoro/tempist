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
        className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-coral"
      >
        <Plus className="size-3" /> Aggiungi attività
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
        placeholder="Titolo attività…"
        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="inline-flex h-7 items-center rounded bg-foreground px-2.5 font-mono text-[10px] uppercase tracking-wider text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setTitle("");
        }}
        disabled={pending}
        className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        Cancel
      </button>
      {error && (
        <span className="font-mono text-[10px] text-destructive">{error}</span>
      )}
    </form>
  );
}
