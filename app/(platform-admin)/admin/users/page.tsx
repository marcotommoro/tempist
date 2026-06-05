import { UsersMetricsTable } from "@/components/features/platform-admin/users-metrics-table";
import { PageHeader } from "@/components/features/page-header/page-header";
import { Card } from "@/components/ui/card";
import { listUsersWithMetrics } from "@/lib/domain/platform-admin";

type Search = { q?: string };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q } = await searchParams;
  const { users, total } = await listUsersWithMetrics({ search: q });

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Users"
        emphasis="registrati"
        meta={`${total} utenti`}
        description="Metriche di utilizzo per ogni account sulla piattaforma."
        actions={
          <form action="/admin/users" method="get" className="flex items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Cerca email o nome…"
              className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
          </form>
        }
      />
      <Card className="overflow-hidden">
        <UsersMetricsTable users={users} />
      </Card>
    </div>
  );
}
