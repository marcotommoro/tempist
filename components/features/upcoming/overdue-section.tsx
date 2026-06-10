"use client";

import { useState, useTransition } from "react";
import { CalendarClock, ChevronDown, ChevronRight } from "lucide-react";

import { rescheduleOverdueAction } from "@/lib/actions/tasks";
import { TaskListByGroup } from "@/components/features/tasks/task-list-by-group";
import { type ProjectMeta } from "@/components/features/tasks/task-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Project, Task } from "@/lib/db/schema";
import type { SubtaskCounts } from "@/lib/domain/tasks";
import type { ClientMeta } from "@/lib/utils/client-by-task";
import type { TaskGroupMode } from "@/lib/utils/group-by-project";

export function OverdueSection({
  tasks,
  title = "Scadute",
  group = "flat",
  projects,
  trackedByTask,
  remindersByTask,
  commentsByTask,
  subtaskCountsByTask,
  projectsById,
  clientByTask,
  currentUserId,
}: {
  tasks: Task[];
  title?: string;
  group?: TaskGroupMode;
  projects: ReadonlyArray<Pick<Project, "id" | "name" | "color" | "isFavorite">>;
  trackedByTask: Map<string, number>;
  remindersByTask: Map<string, number>;
  commentsByTask?: Map<string, number>;
  subtaskCountsByTask?: Map<string, SubtaskCounts>;
  projectsById?: Map<string, ProjectMeta>;
  clientByTask?: Map<string, ClientMeta>;
  currentUserId?: string;
}) {
  const [open, setOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reschedule() {
    setError(null);
    startTransition(async () => {
      const res = await rescheduleOverdueAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirmOpen(false);
    });
  }

  if (tasks.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 font-mono text-[0.6875em] uppercase tracking-[0.16em] text-destructive hover:opacity-80"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
          {title}
          <span className="ml-1 font-mono text-[0.625em] tabular-nums text-destructive/70">
            {String(tasks.length).padStart(2, "0")}
          </span>
        </button>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              disabled={pending}
              className="font-mono text-[0.625em] uppercase tracking-wider text-destructive transition-colors hover:underline disabled:opacity-50"
            >
              {pending ? "…" : "Reschedule all"}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <CalendarClock className="size-5" />
                Rischedula tutte le task scadute
              </DialogTitle>
              <DialogDescription>
                Sposterai <strong>{tasks.length}</strong>{" "}
                {tasks.length === 1 ? "task scaduta" : "task scadute"} a oggi.
                Vuoi procedere?
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p className="font-mono text-[0.6875em] text-destructive">{error}</p>
            )}
            <DialogFooter>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={pending}
                className="rounded-md border border-input bg-background px-3 py-2 font-mono text-[0.6875em] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={reschedule}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-2 font-mono text-[0.6875em] uppercase tracking-wider text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                <CalendarClock className="size-3.5" />
                {pending ? "Sposto…" : "Sì, sposta a oggi"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            subtaskCountsByTask={subtaskCountsByTask}
            projectsById={projectsById}
            clientByTask={clientByTask}
            currentUserId={currentUserId}
            emptyMessage="Nessuna scadenza in arretrato."
          />
        </>
      )}
    </section>
  );
}
