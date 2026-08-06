import type { ResolvedBillingRange } from "@/lib/utils/billing-period";
import { WeeklyQuickEntryGrid } from "./weekly-quick-entry-grid";

type Column = { id: string | null; name: string };

type CellSeed = {
  dayKey: string;
  projectId: string | null;
  managedSeconds: number;
  totalSeconds: number;
};

export function ClientQuickEntryGrid({
  clientId,
  projects,
  days,
  range,
  cells,
  basePath,
  preservedParams,
  exportHref,
}: {
  clientId: string;
  projects: Column[];
  days: Date[];
  range: ResolvedBillingRange;
  cells: CellSeed[];
  basePath: string;
  preservedParams?: Record<string, string>;
  exportHref?: string;
}) {
  return (
    <WeeklyQuickEntryGrid
      mode="client"
      entityId={clientId}
      columns={projects}
      days={days}
      range={range}
      cells={cells.map((c) => ({
        dayKey: c.dayKey,
        columnId: c.projectId,
        managedSeconds: c.managedSeconds,
        totalSeconds: c.totalSeconds,
      }))}
      basePath={basePath}
      preservedParams={preservedParams}
      exportHref={exportHref}
      noneColumnLabel="Senza progetto"
    />
  );
}
