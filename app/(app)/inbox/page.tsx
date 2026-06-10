import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getInboxTasks, getSubtaskCountsByParent } from "@/lib/domain/tasks";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { getCommentCountByTask } from "@/lib/domain/comments";
import { listProjects } from "@/lib/domain/projects";
import { listClients } from "@/lib/domain/clients";
import { TaskList } from "@/components/features/tasks/task-list";
import { CreateTaskDialog } from "@/components/features/tasks/create-task-dialog";
import { PageHeader } from "@/components/features/page-header/page-header";
import {
  defaultTaskScheduledAt,
  userTimezone,
} from "@/lib/utils/default-task-scheduled-at";
import { buildClientByTask } from "@/lib/utils/client-by-task";

export default async function InboxPage() {
  const { user, organizationId } = await requireActiveOrganization();
  const timezone = userTimezone(user);
  const defaultScheduledAt = defaultTaskScheduledAt(timezone);
  const tasks = await getInboxTasks({ organizationId });
  const taskIds = tasks.map((t) => t.id);
  const [
    trackedByTask,
    remindersByTask,
    commentsByTask,
    subtaskCountsByTask,
    projects,
    clients,
  ] = await Promise.all([
    getTrackedSecondsByTask({ organizationId, taskIds }),
    getPendingReminderCountByTask(taskIds),
    getCommentCountByTask({ taskIds }),
    getSubtaskCountsByParent({ organizationId, taskIds }),
    listProjects({ organizationId }),
    listClients({ organizationId }),
  ]);

  const clientByTask = buildClientByTask(tasks, projects, clients);

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

      <CreateTaskDialog
        defaultScheduledAt={defaultScheduledAt}
        timezone={timezone}
        projects={projects}
        clients={clients}
      />

      <TaskList
        tasks={tasks}
        trackedByTask={trackedByTask}
        remindersByTask={remindersByTask}
        commentsByTask={commentsByTask}
        subtaskCountsByTask={subtaskCountsByTask}
        clientByTask={clientByTask}
        currentUserId={user.id}
        emptyMessage="Inbox vuota."
      />
    </div>
  );
}
