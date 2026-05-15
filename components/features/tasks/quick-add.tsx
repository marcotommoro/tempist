"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { createTaskAction } from "@/lib/actions/tasks";

/**
 * QuickAdd v1 — input semplice senza NLP.
 * - Su Today: `defaultScheduledAt` valorizzato → il task creato apparirà subito qui.
 * - Su Inbox/Upcoming: nessun default → il task finisce in Inbox.
 *
 * Phase 1.2 estenderà l'input con NLP parsing (chrono-node + token #proj @label p1).
 */
export function QuickAdd({ defaultScheduledAt }: { defaultScheduledAt?: Date }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", trimmed);
      if (defaultScheduledAt) {
        fd.set("scheduledAt", defaultScheduledAt.toISOString());
      }
      const res = await createTaskAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-1">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={pending}
          placeholder="Aggiungi un task (Invio per salvare)..."
          autoComplete="off"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-4" />
          Aggiungi
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
