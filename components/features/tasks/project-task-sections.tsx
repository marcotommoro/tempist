"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { ProjectTaskGroup } from "@/lib/utils/group-by-project";
import type { Task } from "@/lib/db/schema";
import { TaskList, type ProjectMeta } from "./task-list";

export function ProjectTaskSections({
  groups,
  trackedByTask,
  remindersByTask,
  commentsByTask,
  projectsById,
  currentUserId,
  emptyMessage = "Nessun task.",
}: {
  groups: ProjectTaskGroup<Task>[];
  trackedByTask?: Map<string, number>;
  remindersByTask?: Map<string, number>;
  commentsByTask?: Map<string, number>;
  projectsById?: Map<string, ProjectMeta>;
  currentUserId?: string;
  emptyMessage?: string;
}) {
  if (groups.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-border/80 bg-secondary/50 px-6 py-14 text-center shadow-xs">
        <p className="font-display text-lg leading-relaxed text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <ProjectTaskSection
          key={group.projectId ?? "unassigned"}
          group={group}
          trackedByTask={trackedByTask}
          remindersByTask={remindersByTask}
          commentsByTask={commentsByTask}
          projectsById={projectsById}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

function ProjectTaskSection({
  group,
  trackedByTask,
  remindersByTask,
  commentsByTask,
  projectsById,
  currentUserId,
}: {
  group: ProjectTaskGroup<Task>;
  trackedByTask?: Map<string, number>;
  remindersByTask?: Map<string, number>;
  commentsByTask?: Map<string, number>;
  projectsById?: Map<string, ProjectMeta>;
  currentUserId?: string;
}) {
  const [open, setOpen] = useState(true);
  const meta = group.meta;
  const openCount = group.tasks.filter((t) => !t.completedAt).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="size-3 shrink-0" />
          ) : (
            <ChevronRight className="size-3 shrink-0" />
          )}
          {meta?.color ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
              style={{ backgroundColor: meta.color }}
              aria-hidden
            />
          ) : null}
          <span className="truncate text-foreground">{meta?.name ?? "Senza progetto"}</span>
          <span className="font-mono text-[0.625rem] tabular-nums text-muted-foreground">
            {String(openCount).padStart(2, "0")}
          </span>
        </button>
      </div>
      {open ? (
        <TaskList
          tasks={group.tasks}
          trackedByTask={trackedByTask}
          remindersByTask={remindersByTask}
          commentsByTask={commentsByTask}
          projectsById={projectsById}
          currentUserId={currentUserId}
          showProjectBadge={false}
        />
      ) : null}
    </section>
  );
}
