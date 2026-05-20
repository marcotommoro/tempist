"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { rescheduleOverdueAction } from "@/lib/actions/tasks";
import { TaskListByGroup } from "@/components/features/tasks/task-list-by-group";
import { type ProjectMeta } from "@/components/features/tasks/task-list";
import type { Project, Task } from "@/lib/db/schema";
import type { TaskGroupMode } from "@/lib/utils/group-by-project";

export function OverdueSection({
  tasks,
  title = "Scadute",
  group = "flat",
  projects,
  trackedByTask,
  remindersByTask,
  commentsByTask,
  projectsById,
  currentUserId,
}: {
  tasks: Task[];
  title?: string;
  group?: TaskGroupMode;
  projects: ReadonlyArray<Pick<Project, "id" | "name" | "color" | "isFavorite">>;
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
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-destructive hover:opacity-80"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
          {title}
          <span className="ml-1 font-mono text-[10px] tabular-nums text-destructive/70">
            {String(tasks.length).padStart(2, "0")}
          </span>
        </button>
        <button
          type="button"
          onClick={reschedule}
          disabled={pending}
          className="font-mono text-[10px] uppercase tracking-wider text-destructive transition-colors hover:underline disabled:opacity-50"
        >
          {pending ? "…" : "Reschedule all"}
        </button>
      </div>
      {open && (
        <>
          <TaskListByGroup
            group={group}
            tasks={tasks}
            projects={projects}
            trackedByTask={trackedByTask}
            remindersByTask={remindersByTask}
            commentsByTask={commentsByTask}
            projectsById={projectsById}
            currentUserId={currentUserId}
            emptyMessage="Nessuna scadenza in arretrato."
          />
          {error && (
            <p className="font-mono text-[11px] text-destructive">{error}</p>
          )}
        </>
      )}
    </section>
  );
}
