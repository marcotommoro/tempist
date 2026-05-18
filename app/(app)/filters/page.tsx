import Link from "next/link";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listSavedFilters } from "@/lib/domain/saved-filters";
import { CreateFilterForm } from "@/components/features/filters/create-filter-form";

export default async function FiltersPage() {
  const { user, organizationId } = await requireActiveOrganization();
  const filters = await listSavedFilters({ organizationId, userId: user.id });

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Filtri</h1>
        <p className="text-sm text-muted-foreground">
          {filters.length === 0
            ? "Nessun filtro salvato."
            : `${filters.length} filtr${filters.length === 1 ? "o" : "i"}.`}
        </p>
      </header>

      <CreateFilterForm />

      {filters.length > 0 && (
        <ul className="divide-y divide-border rounded-md border bg-card">
          {filters.map((f) => (
            <li key={f.id}>
              <Link
                href={`/filters/${f.id}`}
                className="block px-4 py-3 hover:bg-muted"
              >
                <div className="font-medium text-sm">{f.name}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {f.queryDsl}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
