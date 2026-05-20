import type { Task } from "@/lib/db/schema";
import type { Project } from "@/lib/db/schema";
import { groupByProject, type TaskGroupMode } from "@/lib/utils/group-by-project";
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
      currentUserId={currentUserId}
      emptyMessage={emptyMessage}
      showProjectBadge
    />
  );
}
