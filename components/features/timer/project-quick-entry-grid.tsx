import { WeeklyQuickEntryGrid } from "./weekly-quick-entry-grid";

type Column = { id: string | null; name: string };

type CellSeed = {
  dayKey: string;
  taskId: string | null;
  managedSeconds: number;
  totalSeconds: number;
};

export function ProjectQuickEntryGrid({
  projectId,
  tasks,
  weekStart,
  cells,
  basePath,
  preservedParams,
}: {
  projectId: string;
  tasks: Column[];
  weekStart: Date;
  cells: CellSeed[];
  basePath: string;
  preservedParams?: Record<string, string>;
}) {
  return (
    <WeeklyQuickEntryGrid
      mode="project"
      entityId={projectId}
      columns={tasks}
      weekStart={weekStart}
      cells={cells.map((c) => ({
        dayKey: c.dayKey,
        columnId: c.taskId,
        managedSeconds: c.managedSeconds,
        totalSeconds: c.totalSeconds,
      }))}
      basePath={basePath}
      preservedParams={preservedParams}
      noneColumnLabel="Senza task"
    />
  );
}
