import { notFound } from "next/navigation";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getSavedFilter } from "@/lib/domain/saved-filters";
import { parseFilter } from "@/lib/parsers/filter-dsl";
import { executeFilter } from "@/lib/domain/filters";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { TaskList } from "@/components/features/tasks/task-list";
import { PageHeader } from "@/components/features/page-header/page-header";

type Params = { id: string };

export default async function FilterDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const { user, organizationId } = await requireActiveOrganization();
  const filter = await getSavedFilter({ filterId: id, organizationId, userId: user.id });
  if (!filter) notFound();

  const timezone = (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";
  const parsed = parseFilter(filter.queryDsl);
  const tasks = await executeFilter(parsed, { organizationId, timezone });
  const taskIds = tasks.map((t) => t.id);
  const [trackedByTask, remindersByTask] = await Promise.all([
    getTrackedSecondsByTask({ organizationId, taskIds }),
    getPendingReminderCountByTask(taskIds),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Saved filter"
        title={filter.name}
        meta={
          <>
            <span>
              <span className="text-foreground tabular-nums">{tasks.length}</span>{" "}
              {tasks.length === 1 ? "match" : "matches"}
            </span>
          </>
        }
      />

      <div className="overflow-hidden rounded-md border border-border bg-muted/30 px-3.5 py-2.5">
        <div className="mb-1 font-mono text-[0.5625em] uppercase tracking-[0.18em] text-muted-foreground">
          Query
        </div>
        <code className="block font-mono text-xs leading-relaxed text-foreground">
          {filter.queryDsl}
        </code>
      </div>

      <TaskList
        tasks={tasks}
        trackedByTask={trackedByTask}
        remindersByTask={remindersByTask}
        emptyMessage="Nessun task matcha questo filtro."
      />
    </div>
  );
}
