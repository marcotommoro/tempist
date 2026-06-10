import type { Task } from "@/lib/db/schema";
import type { Project } from "@/lib/db/schema";
import { groupByProject, type TaskGroupMode } from "@/lib/utils/group-by-project";
import type { ClientMeta } from "@/lib/utils/client-by-task";
import { TaskList, type ProjectMeta } from "./task-list";
import { ProjectTaskSections } from "./project-task-sections";

export function TaskListByGroup({
  group,
  tasks,
  projects,
  trackedByTask,
  remindersByTask,
  commentsByTask,
  projectsById,
  clientByTask,
  currentUserId,
  emptyMessage,
}: {
  group: TaskGroupMode;
  tasks: Task[];
  projects: ReadonlyArray<Pick<Project, "id" | "name" | "color" | "isFavorite">>;
  trackedByTask?: Map<string, number>;
  remindersByTask?: Map<string, number>;
  commentsByTask?: Map<string, number>;
  projectsById?: Map<string, ProjectMeta>;
  clientByTask?: Map<string, ClientMeta>;
  currentUserId?: string;
  emptyMessage?: string;
}) {
  if (group === "project") {
    const groups = groupByProject(tasks, projects);
    return (
      <ProjectTaskSections
        groups={groups}
        trackedByTask={trackedByTask}
        remindersByTask={remindersByTask}
        commentsByTask={commentsByTask}
        projectsById={projectsById}
        clientByTask={clientByTask}
        currentUserId={currentUserId}
        emptyMessage={emptyMessage}
      />
    );
  }

  return (
    <TaskList
      tasks={tasks}
      trackedByTask={trackedByTask}
      remindersByTask={remindersByTask}
      commentsByTask={commentsByTask}
      projectsById={projectsById}
      clientByTask={clientByTask}
      currentUserId={currentUserId}
      emptyMessage={emptyMessage}
      showProjectBadge
    />
  );
}
