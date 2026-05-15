import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getTodayTasks } from "@/lib/domain/tasks";
import { TaskList } from "@/components/features/tasks/task-list";
import { QuickAdd } from "@/components/features/tasks/quick-add";

export default async function TodayPage() {
  const { user, organizationId } = await requireActiveOrganization();
  const timezone =
    (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";

  const tasks = await getTodayTasks({ organizationId, timezone });

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">
          {tasks.length === 0
            ? "Nessun task per oggi."
            : `${tasks.length} task da fare oggi.`}
        </p>
      </header>

      <QuickAdd defaultScheduledAt={new Date()} />

      <TaskList tasks={tasks} emptyMessage="Tutto pulito per oggi. ✨" />
    </div>
  );
}
