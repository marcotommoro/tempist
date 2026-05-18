import { notFound } from "next/navigation";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getSavedFilter } from "@/lib/domain/saved-filters";
import { parseFilter } from "@/lib/parsers/filter-dsl";
import { executeFilter } from "@/lib/domain/filters";
import { TaskList } from "@/components/features/tasks/task-list";

type Params = { id: string };

export default async function FilterDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const { user, organizationId } = await requireActiveOrganization();
  const filter = await getSavedFilter({ filterId: id, organizationId, userId: user.id });
  if (!filter) notFound();

  const timezone = (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";
  const parsed = parseFilter(filter.queryDsl);
  const tasks = await executeFilter(parsed, { organizationId, timezone });

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{filter.name}</h1>
        <code className="text-xs text-muted-foreground">{filter.queryDsl}</code>
      </header>

      <TaskList
        tasks={tasks}
        emptyMessage="Nessun task matcha questo filtro."
      />
    </div>
  );
}
