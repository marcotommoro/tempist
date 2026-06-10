"use client";

/**
 * Sezione "Sottoattività" del task detail dialog.
 *
 * Lo stato della lista vive nel dialog (prop subtasks + onSubtasksChange):
 * così il completamento del padre può ricaricare i figli e riflettere la
 * cascata server-side. Toggle e delete sono ottimistici con rollback.
 */

import { useState, useTransition, type FormEvent } from "react";
import { Trash2 } from "lucide-react";

import {
  createSubtaskAction,
  deleteTaskAction,
  toggleTaskAction,
} from "@/lib/actions/tasks";
import type { Task } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function TaskSubtasksSection({
  parentTaskId,
  subtasks,
  onSubtasksChange,
}: {
  parentTaskId: string;
  subtasks: Task[];
  onSubtasksChange: (next: Task[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add(e?: FormEvent) {
    e?.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setError(null);
    setDraft("");
    startTransition(async () => {
      const res = await createSubtaskAction(parentTaskId, title);
      if (!res.ok) {
        setError(res.error);
        setDraft(title);
        return;
      }
      onSubtasksChange([...subtasks, res.data]);
    });
  }

  function toggle(sub: Task) {
    setError(null);
    onSubtasksChange(
      subtasks.map((s) =>
        s.id === sub.id
          ? { ...s, completedAt: s.completedAt ? null : new Date() }
          : s,
      ),
    );
    startTransition(async () => {
      const res = await toggleTaskAction(sub.id);
      if (!res.ok) {
        setError(res.error);
        onSubtasksChange(subtasks);
      }
    });
  }

  function remove(sub: Task) {
    setError(null);
    onSubtasksChange(subtasks.filter((s) => s.id !== sub.id));
    startTransition(async () => {
      const res = await deleteTaskAction(sub.id);
      if (!res.ok) {
        setError(res.error);
        onSubtasksChange(subtasks);
      }
    });
  }

  return (
    <section className="space-y-2">
      {subtasks.length > 0 && (
        <ul className="space-y-0.5">
          {subtasks.map((s) => {
            const done = !!s.completedAt;
            return (
              <li
                key={s.id}
                className="group flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-accent/40"
              >
                <label className="relative inline-flex shrink-0 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggle(s)}
                    disabled={pending}
                    aria-label={`Completa sottoattività ${s.title}`}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "grid h-[15px] w-[15px] place-items-center rounded-full border transition-all duration-[var(--dur-base)]",
                      done
                        ? "border-sage bg-sage"
                        : "border-muted-foreground/40 hover:border-coral hover:bg-coral/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                    )}
                  >
                    {done && (
                      <svg
                        viewBox="0 0 16 16"
                        className="h-2.5 w-2.5 text-sage-foreground"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3.5 8.5L7 12l5.5-7" />
                      </svg>
                    )}
                  </span>
                </label>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  {s.title}
                </span>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  disabled={pending}
                  aria-label="Elimina sottoattività"
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending}
          placeholder="Aggiungi sottoattività…"
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </section>
  );
}
