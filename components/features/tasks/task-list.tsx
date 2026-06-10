import { TaskItem } from "./task-item";
import type { Task } from "@/lib/db/schema";
import type { SubtaskCounts } from "@/lib/domain/tasks";
import type { ClientMeta } from "@/lib/utils/client-by-task";

export type ProjectMeta = { name: string; color: string };

export function TaskList({
  tasks,
  trackedByTask,
  remindersByTask,
  commentsByTask,
  subtaskCountsByTask,
  projectsById,
  clientByTask,
  currentUserId,
  emptyMessage = "Nessun task.",
  showProjectBadge = true,
}: {
  tasks: Task[];
  /** Map<taskId, trackedSeconds> per arricchire ogni item con la sua progress bar */
  trackedByTask?: Map<string, number>;
  /** Map<taskId, count> reminder pending */
  remindersByTask?: Map<string, number>;
  /** Map<taskId, count> commenti */
  commentsByTask?: Map<string, number>;
  /** Map<taskId, {total, completed}> sottoattività per il badge "2/5" */
  subtaskCountsByTask?: Map<string, SubtaskCounts>;
  /** Map<projectId, {name, color}> per visualizzare il nome del progetto nel dialog */
  projectsById?: Map<string, ProjectMeta>;
  /** Map<taskId, {name, color}> per il badge cliente sulla card */
  clientByTask?: Map<string, ClientMeta>;
  currentUserId?: string;
  emptyMessage?: string;
  showProjectBadge?: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-border/80 bg-secondary/50 px-6 py-14 text-center shadow-xs">
        <p className="font-display text-lg leading-relaxed text-muted-foreground">
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
        <ul className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-xs">
          {incomplete.map((t) => {
            const projectMeta = t.projectId
              ? projectsById?.get(t.projectId)
              : undefined;
            const clientMeta = clientByTask?.get(t.id);
            return (
              <TaskItem
                key={t.id}
                task={t}
                trackedSeconds={trackedByTask?.get(t.id) ?? 0}
                reminderCount={remindersByTask?.get(t.id) ?? 0}
                commentCount={commentsByTask?.get(t.id) ?? 0}
                subtaskCounts={subtaskCountsByTask?.get(t.id) ?? null}
                projectName={showProjectBadge ? (projectMeta?.name ?? null) : null}
                projectColor={showProjectBadge ? (projectMeta?.color ?? null) : null}
                clientName={clientMeta?.name ?? null}
                clientColor={clientMeta?.color ?? null}
                currentUserId={currentUserId}
              />
            );
          })}
        </ul>
      )}
      {completed.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between border-b border-border pb-1.5">
            <h3 className="font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
              Completed
            </h3>
            <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
              {String(completed.length).padStart(2, "0")}
            </span>
          </div>
          <ul className="overflow-hidden rounded-lg border border-border/80 bg-card/80 shadow-xs">
            {completed.map((t) => {
              const projectMeta = t.projectId
                ? projectsById?.get(t.projectId)
                : undefined;
              const clientMeta = clientByTask?.get(t.id);
              return (
                <TaskItem
                  key={t.id}
                  task={t}
                  trackedSeconds={trackedByTask?.get(t.id) ?? 0}
                  reminderCount={remindersByTask?.get(t.id) ?? 0}
                  commentCount={commentsByTask?.get(t.id) ?? 0}
                  projectName={showProjectBadge ? (projectMeta?.name ?? null) : null}
                  projectColor={showProjectBadge ? (projectMeta?.color ?? null) : null}
                  clientName={clientMeta?.name ?? null}
                  clientColor={clientMeta?.color ?? null}
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
