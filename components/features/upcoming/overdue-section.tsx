"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { rescheduleOverdueAction } from "@/lib/actions/tasks";
import { TaskList, type ProjectMeta } from "@/components/features/tasks/task-list";
import type { Task } from "@/lib/db/schema";

export function OverdueSection({
  tasks,
  trackedByTask,
  remindersByTask,
  commentsByTask,
  projectsById,
  currentUserId,
}: {
  tasks: Task[];
  trackedByTask: Map<string, number>;
  remindersByTask: Map<string, number>;
  commentsByTask?: Map<string, number>;
  projectsById?: Map<string, ProjectMeta>;
  currentUserId?: string;
}) {
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reschedule() {
    setError(null);
    startTransition(async () => {
      const res = await rescheduleOverdueAction();
      if (!res.ok) setError(res.error);
    });
  }

  if (tasks.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between border-b pb-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          Scadute
          <span className="ml-1 text-xs text-muted-foreground tabular-nums">
            ({tasks.length})
          </span>
        </button>
        <button
          type="button"
          onClick={reschedule}
          disabled={pending}
          className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
        >
          {pending ? "…" : "Ripianifica"}
        </button>
      </div>
      {open && (
        <>
          <TaskList
            tasks={tasks}
            trackedByTask={trackedByTask}
            remindersByTask={remindersByTask}
            commentsByTask={commentsByTask}
            projectsById={projectsById}
            currentUserId={currentUserId}
            emptyMessage="Nessuna scadenza in arretrato."
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}
    </section>
  );
}
