import { TaskItem } from "./task-item";
import type { Task } from "@/lib/db/schema";

export type ProjectMeta = { name: string; color: string };

export function TaskList({
  tasks,
  trackedByTask,
  remindersByTask,
  commentsByTask,
  projectsById,
  currentUserId,
  emptyMessage = "Nessun task.",
}: {
  tasks: Task[];
  /** Map<taskId, trackedSeconds> per arricchire ogni item con la sua progress bar */
  trackedByTask?: Map<string, number>;
  /** Map<taskId, count> reminder pending */
  remindersByTask?: Map<string, number>;
  /** Map<taskId, count> commenti */
  commentsByTask?: Map<string, number>;
  /** Map<projectId, {name, color}> per visualizzare il nome del progetto nel dialog */
  projectsById?: Map<string, ProjectMeta>;
  currentUserId?: string;
  emptyMessage?: string;
}) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {emptyMessage}
      </p>
    );
  }
  // Sort: incomplete tasks first (existing order), then completed at the bottom.
  const incomplete: Task[] = [];
  const completed: Task[] = [];
  for (const t of tasks) {
    if (t.completedAt) completed.push(t);
    else incomplete.push(t);
  }
  const ordered = [...incomplete, ...completed];

  return (
    <ul className="divide-y divide-border rounded-md border bg-card">
      {ordered.map((t) => {
        const projectMeta = t.projectId ? projectsById?.get(t.projectId) : undefined;
        return (
          <TaskItem
            key={t.id}
            task={t}
            trackedSeconds={trackedByTask?.get(t.id) ?? 0}
            reminderCount={remindersByTask?.get(t.id) ?? 0}
            commentCount={commentsByTask?.get(t.id) ?? 0}
            projectName={projectMeta?.name ?? null}
            projectColor={projectMeta?.color ?? null}
            currentUserId={currentUserId}
          />
        );
      })}
    </ul>
  );
}
