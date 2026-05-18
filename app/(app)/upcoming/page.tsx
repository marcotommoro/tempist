import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getUpcomingTasks } from "@/lib/domain/tasks";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { TaskList } from "@/components/features/tasks/task-list";

export default async function UpcomingPage() {
  const { user, organizationId } = await requireActiveOrganization();
  const timezone =
    (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";

  const tasks = await getUpcomingTasks({ organizationId, timezone, horizonDays: 30 });
  const trackedByTask = await getTrackedSecondsByTask({
    organizationId,
    taskIds: tasks.map((t) => t.id),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Upcoming</h1>
        <p className="text-sm text-muted-foreground">
          Task programmati nei prossimi 30 giorni.
        </p>
      </header>

      <TaskList
        tasks={tasks}
        trackedByTask={trackedByTask}
        emptyMessage="Nessun task programmato."
      />
    </div>
  );
}
