import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getInboxTasks } from "@/lib/domain/tasks";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { getCommentCountByTask } from "@/lib/domain/comments";
import { TaskList } from "@/components/features/tasks/task-list";
import { QuickAdd } from "@/components/features/tasks/quick-add";
import { PageHeader } from "@/components/features/page-header/page-header";
import {
  defaultTaskScheduledAt,
  userTimezone,
} from "@/lib/utils/default-task-scheduled-at";

export default async function InboxPage() {
  const { user, organizationId } = await requireActiveOrganization();
  const timezone = userTimezone(user);
  const defaultScheduledAt = defaultTaskScheduledAt(timezone);
  const tasks = await getInboxTasks({ organizationId });
  const taskIds = tasks.map((t) => t.id);
  const [trackedByTask, remindersByTask, commentsByTask] = await Promise.all([
    getTrackedSecondsByTask({ organizationId, taskIds }),
    getPendingReminderCountByTask(taskIds),
    getCommentCountByTask({ taskIds }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        meta={
          <>
            <span>
              <span className="text-foreground tabular-nums">{tasks.length}</span>{" "}
              {tasks.length === 1 ? "task" : "tasks"}
            </span>
            <span aria-hidden>·</span>
            <span>unsorted</span>
          </>
        }
        description="Task non assegnati a nessun progetto. Aggiungi qui le idee veloci."
      />

      <QuickAdd defaultScheduledAt={defaultScheduledAt} timezone={timezone} />

      <TaskList
        tasks={tasks}
        trackedByTask={trackedByTask}
        remindersByTask={remindersByTask}
        commentsByTask={commentsByTask}
        currentUserId={user.id}
        emptyMessage="Inbox vuota."
      />
    </div>
  );
}
