import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getTodayTasks } from "@/lib/domain/tasks";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { getCommentCountByTask } from "@/lib/domain/comments";
import { listProjects } from "@/lib/domain/projects";
import { TaskList, type ProjectMeta } from "@/components/features/tasks/task-list";
import { QuickAdd } from "@/components/features/tasks/quick-add";
import { PageHeader } from "@/components/features/page-header/page-header";

export default async function TodayPage() {
  const { user, organizationId } = await requireActiveOrganization();
  const timezone =
    (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";

  const tasks = await getTodayTasks({ organizationId, timezone });
  const taskIds = tasks.map((t) => t.id);
  const [trackedByTask, remindersByTask, commentsByTask, projects] = await Promise.all([
    getTrackedSecondsByTask({ organizationId, taskIds }),
    getPendingReminderCountByTask(taskIds),
    getCommentCountByTask({ taskIds }),
    listProjects({ organizationId }),
  ]);

  const projectsById = new Map<string, ProjectMeta>(
    projects.map((p) => [p.id, { name: p.name, color: p.color }]),
  );

  const todayLocal = toZonedTime(new Date(), timezone);
  const openCount = tasks.filter((t) => !t.completedAt).length;
  const completedCount = tasks.length - openCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today"
        meta={
          <>
            <span className="text-foreground">
              {format(todayLocal, "EEEE, d LLLL")}
            </span>
            <span aria-hidden>·</span>
            <span>
              <span className="text-foreground tabular-nums">{openCount}</span>{" "}
              open
            </span>
            {completedCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  <span className="text-foreground tabular-nums">{completedCount}</span>{" "}
                  done
                </span>
              </>
            ) : null}
          </>
        }
      />

      <QuickAdd defaultScheduledAt={new Date()} />

      <TaskList
        tasks={tasks}
        trackedByTask={trackedByTask}
        remindersByTask={remindersByTask}
        commentsByTask={commentsByTask}
        projectsById={projectsById}
        currentUserId={user.id}
        emptyMessage="Tutto pulito per oggi."
      />
    </div>
  );
}
