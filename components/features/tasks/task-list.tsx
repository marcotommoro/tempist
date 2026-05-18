import { TaskItem } from "./task-item";
import type { Task } from "@/lib/db/schema";

export function TaskList({
  tasks,
  trackedByTask,
  remindersByTask,
  emptyMessage = "Nessun task.",
}: {
  tasks: Task[];
  /** Map<taskId, trackedSeconds> per arricchire ogni item con la sua progress bar */
  trackedByTask?: Map<string, number>;
  /** Map<taskId, count> reminder pending */
  remindersByTask?: Map<string, number>;
  emptyMessage?: string;
}) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {emptyMessage}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-md border bg-card">
      {tasks.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          trackedSeconds={trackedByTask?.get(t.id) ?? 0}
          reminderCount={remindersByTask?.get(t.id) ?? 0}
        />
      ))}
    </ul>
  );
}
