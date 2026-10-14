import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getOpenTasks, getSubtaskCountsByParent } from "@/lib/domain/tasks";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { getCommentCountByTask } from "@/lib/domain/comments";
import { listProjects } from "@/lib/domain/projects";
import { listClients } from "@/lib/domain/clients";
import { TaskList, type ProjectMeta } from "@/components/features/tasks/task-list";
import { CreateTaskDialog } from "@/components/features/tasks/create-task-dialog";
import { PageHeader } from "@/components/features/page-header/page-header";
import {
  defaultTaskScheduledAt,
  userTimezone,
} from "@/lib/utils/default-task-scheduled-at";
import { buildClientByTask } from "@/lib/utils/client-by-task";

export default async function TasksPage() {
  const { user, organizationId } = await requireActiveOrganization();
  const timezone = userTimezone(user);
  const defaultScheduledAt = defaultTaskScheduledAt(timezone);
  const tasks = await getOpenTasks({ organizationId });
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

  const projectsById = new Map<string, ProjectMeta>(
    projects.map((p) => [p.id, { name: p.name, color: p.color }]),
  );
  const clientByTask = buildClientByTask(tasks, projects, clients);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attività"
        meta={
          <span>
            <span className="text-foreground tabular-nums">{tasks.length}</span>{" "}
            aperte
          </span>
        }
        description="Tutti i task aperti, i più recenti prima."
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
        projectsById={projectsById}
        clientByTask={clientByTask}
        currentUserId={user.id}
        emptyMessage="Nessuna attività aperta."
      />
    </div>
  );
}
