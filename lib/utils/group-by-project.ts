export type ProjectGroupMeta = {
  name: string;
  color: string;
  isFavorite: boolean;
};

export type ProjectTaskGroup<T> = {
  projectId: string | null;
  meta: ProjectGroupMeta | null;
  tasks: T[];
};

export type TaskGroupMode = "flat" | "project";

export function parseTaskGroupMode(raw: string | undefined): TaskGroupMode {
  return raw === "project" ? "project" : "flat";
}

const UNASSIGNED_LABEL = "Senza progetto";
const FALLBACK_COLOR = "#808080";

function compareProjects(
  a: { name: string; isFavorite: boolean },
  b: { name: string; isFavorite: boolean },
): number {
  if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
  return a.name.localeCompare(b.name, "it");
}

export function groupByProject<T extends { projectId: string | null }>(
  tasks: T[],
  projects: ReadonlyArray<{
    id: string;
    name: string;
    color: string;
    isFavorite: boolean;
  }>,
): ProjectTaskGroup<T>[] {
  const byProject = new Map<string | null, T[]>();
  for (const task of tasks) {
    const key = task.projectId;
    const arr = byProject.get(key);
    if (arr) arr.push(task);
    else byProject.set(key, [task]);
  }

  const groups: ProjectTaskGroup<T>[] = [];
  const sortedProjects = [...projects].sort(compareProjects);

  for (const project of sortedProjects) {
    const projectTasks = byProject.get(project.id);
    if (!projectTasks || projectTasks.length === 0) continue;
    groups.push({
      projectId: project.id,
      meta: {
        name: project.name,
        color: project.color,
        isFavorite: project.isFavorite,
      },
      tasks: projectTasks,
    });
    byProject.delete(project.id);
  }

  const orphanIds = [...byProject.keys()].filter((k): k is string => k !== null);
  orphanIds.sort((a, b) => a.localeCompare(b));
  for (const projectId of orphanIds) {
    const projectTasks = byProject.get(projectId);
    if (!projectTasks || projectTasks.length === 0) continue;
    groups.push({
      projectId,
      meta: {
        name: "Progetto",
        color: FALLBACK_COLOR,
        isFavorite: false,
      },
      tasks: projectTasks,
    });
    byProject.delete(projectId);
  }

  const unassigned = byProject.get(null);
  if (unassigned && unassigned.length > 0) {
    groups.push({
      projectId: null,
      meta: {
        name: UNASSIGNED_LABEL,
        color: FALLBACK_COLOR,
        isFavorite: false,
      },
      tasks: unassigned,
    });
  }

  return groups;
}
