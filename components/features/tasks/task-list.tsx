import { TaskItem } from "./task-item";
import type { Task } from "@/lib/db/schema";

export function TaskList({
  tasks,
  emptyMessage = "Nessun task.",
}: {
  tasks: Task[];
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
        <TaskItem key={t.id} task={t} />
      ))}
    </ul>
  );
}
