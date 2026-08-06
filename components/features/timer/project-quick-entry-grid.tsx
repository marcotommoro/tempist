import type { ResolvedBillingRange } from "@/lib/utils/billing-period";
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
  days,
  range,
  cells,
  basePath,
  preservedParams,
}: {
  projectId: string;
  tasks: Column[];
  days: Date[];
  range: ResolvedBillingRange;
  cells: CellSeed[];
  basePath: string;
  preservedParams?: Record<string, string>;
}) {
  return (
    <WeeklyQuickEntryGrid
      mode="project"
      entityId={projectId}
      columns={tasks}
      days={days}
      range={range}
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
