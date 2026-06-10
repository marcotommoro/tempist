import { TaskListByGroup } from "@/components/features/tasks/task-list-by-group";
import { type ProjectMeta } from "@/components/features/tasks/task-list";
import type { Project, Task } from "@/lib/db/schema";
import type { SubtaskCounts } from "@/lib/domain/tasks";
import type { ClientMeta } from "@/lib/utils/client-by-task";
import type { TaskGroupMode } from "@/lib/utils/group-by-project";

export function TodayScheduledSection({
  tasks,
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
  const openCount = tasks.filter((t) => !t.completedAt).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center border-b border-border pb-1.5">
        <h2 className="inline-flex items-center gap-1.5 font-mono text-[0.6875em] uppercase tracking-[0.16em] text-foreground">
          Oggi
          <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
            {String(openCount).padStart(2, "0")}
          </span>
        </h2>
      </div>
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
        emptyMessage="Nessuna attività per oggi."
      />
    </section>
  );
}
