import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getInboxTasks } from "@/lib/domain/tasks";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { TaskList } from "@/components/features/tasks/task-list";
import { QuickAdd } from "@/components/features/tasks/quick-add";

export default async function InboxPage() {
  const { organizationId } = await requireActiveOrganization();
  const tasks = await getInboxTasks({ organizationId });
  const taskIds = tasks.map((t) => t.id);
  const [trackedByTask, remindersByTask] = await Promise.all([
    getTrackedSecondsByTask({ organizationId, taskIds }),
    getPendingReminderCountByTask(taskIds),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Task non assegnati a nessun progetto. Aggiungi qui le idee veloci.
        </p>
      </header>

      <QuickAdd />

      <TaskList
        tasks={tasks}
        trackedByTask={trackedByTask}
        remindersByTask={remindersByTask}
        emptyMessage="Inbox vuota."
      />
    </div>
  );
}
