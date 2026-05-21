import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getTodayTasks } from "@/lib/domain/tasks";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { getCommentCountByTask } from "@/lib/domain/comments";
import { listProjects } from "@/lib/domain/projects";
import { listClients } from "@/lib/domain/clients";
import { TaskListViewToggle } from "@/components/features/tasks/task-list-view-toggle";
import { type ProjectMeta } from "@/components/features/tasks/task-list";
import { QuickAdd } from "@/components/features/tasks/quick-add";
import { PageHeader } from "@/components/features/page-header/page-header";
import { OverdueSection } from "@/components/features/upcoming/overdue-section";
import { TodayScheduledSection } from "@/components/features/today/today-scheduled-section";
import { parseTaskGroupMode } from "@/lib/utils/group-by-project";
import {
  defaultTaskScheduledAt,
  userTimezone,
} from "@/lib/utils/default-task-scheduled-at";
import { todayBoundsUtc } from "@/lib/utils/today-bounds";
import type { Task } from "@/lib/db/schema";

type Search = { group?: string };

function splitTodayPageTasks(
  tasks: Task[],
  startUtc: Date,
): { overdueTasks: Task[]; todayTasks: Task[] } {
  const overdueTasks: Task[] = [];
  const todayTasks: Task[] = [];
  for (const task of tasks) {
    if (!task.scheduledAt) continue;
    if (!task.completedAt && task.scheduledAt < startUtc) {
      overdueTasks.push(task);
      continue;
    }
    if (task.scheduledAt >= startUtc) {
      todayTasks.push(task);
    }
  }
  return { overdueTasks, todayTasks };
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { group: groupParam } = await searchParams;
  const group = parseTaskGroupMode(groupParam);
  const { user, organizationId } = await requireActiveOrganization();
  const timezone = userTimezone(user);
  const defaultScheduledAt = defaultTaskScheduledAt(timezone);

  const tasks = await getTodayTasks({ organizationId, timezone });
  const taskIds = tasks.map((t) => t.id);
  const [trackedByTask, remindersByTask, commentsByTask, projects, clients] =
    await Promise.all([
      getTrackedSecondsByTask({ organizationId, taskIds }),
      getPendingReminderCountByTask(taskIds),
      getCommentCountByTask({ taskIds }),
      listProjects({ organizationId }),
      listClients({ organizationId }),
    ]);

  const projectsById = new Map<string, ProjectMeta>(
    projects.map((p) => [p.id, { name: p.name, color: p.color }]),
  );

  const todayLocal = toZonedTime(new Date(), timezone);
  const { startUtc } = todayBoundsUtc(timezone);
  const { overdueTasks, todayTasks } = splitTodayPageTasks(tasks, startUtc);
  const openCount = tasks.filter((t) => !t.completedAt).length;
  const completedCount = tasks.length - openCount;
  const overdueCount = overdueTasks.length;

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
              aperte
            </span>
            {overdueCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-destructive">
                  <span className="tabular-nums">{overdueCount}</span> scadute
                </span>
              </>
            ) : null}
            {completedCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  <span className="text-foreground tabular-nums">{completedCount}</span>{" "}
                  completate
                </span>
              </>
            ) : null}
          </>
        }
        actions={<TaskListViewToggle basePath="/today" group={group} />}
      />

      <QuickAdd
        defaultScheduledAt={defaultScheduledAt}
        timezone={timezone}
        projects={projects}
        clients={clients}
      />

      {overdueTasks.length === 0 && todayTasks.length === 0 ? (
        <p className="px-1 font-display text-sm italic text-muted-foreground">
          Tutto pulito per oggi.
        </p>
      ) : (
        <div className="space-y-8">
          <OverdueSection
            tasks={overdueTasks}
            group={group}
            projects={projects}
            trackedByTask={trackedByTask}
            remindersByTask={remindersByTask}
            commentsByTask={commentsByTask}
            projectsById={projectsById}
            currentUserId={user.id}
          />

          <TodayScheduledSection
            tasks={todayTasks}
            group={group}
            projects={projects}
            trackedByTask={trackedByTask}
            remindersByTask={remindersByTask}
            commentsByTask={commentsByTask}
            projectsById={projectsById}
            currentUserId={user.id}
          />
        </div>
      )}
    </div>
  );
}
