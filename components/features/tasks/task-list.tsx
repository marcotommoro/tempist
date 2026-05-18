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
      <div className="overflow-hidden rounded-md border border-dashed border-border bg-card/30 px-6 py-12 text-center">
        <p className="font-display text-lg italic text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }
  // Sort: incomplete tasks first (existing order), then completed at the bottom.
  const incomplete: Task[] = [];
  const completed: Task[] = [];
  for (const t of tasks) {
    if (t.completedAt) completed.push(t);
    else incomplete.push(t);
  }

  return (
    <div className="space-y-4">
      {incomplete.length > 0 && (
        <ul className="overflow-hidden rounded-md border border-border bg-card">
          {incomplete.map((t) => {
            const projectMeta = t.projectId
              ? projectsById?.get(t.projectId)
              : undefined;
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
      )}
      {completed.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between border-b border-border pb-1.5">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Completed
            </h3>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {String(completed.length).padStart(2, "0")}
            </span>
          </div>
          <ul className="overflow-hidden rounded-md border border-border bg-card/60">
            {completed.map((t) => {
              const projectMeta = t.projectId
                ? projectsById?.get(t.projectId)
                : undefined;
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
        </div>
      )}
    </div>
  );
}
