import Link from "next/link";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listProjects } from "@/lib/domain/projects";
import { listClients } from "@/lib/domain/clients";
import { CreateProjectForm } from "@/components/features/projects/create-project-form";

export default async function ProjectsPage() {
  const { organizationId } = await requireActiveOrganization();
  const [projects, clients] = await Promise.all([
    listProjects({ organizationId }),
    listClients({ organizationId }),
  ]);

  const clientById = new Map(clients.map((c) => [c.id, c]));

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">
          {projects.length === 0
            ? "Nessun progetto. Creane uno qui sotto."
            : `${projects.length} progett${projects.length === 1 ? "o" : "i"}.`}
        </p>
      </header>

      <CreateProjectForm clients={clients} />

      {projects.length > 0 && (
        <ul className="divide-y divide-border rounded-md border bg-card">
          {projects.map((p) => {
            const cli = p.clientId ? clientById.get(p.clientId) : null;
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.isFavorite && (
                    <span className="text-xs text-amber-500">★</span>
                  )}
                  {cli && (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cli.color }}
                        aria-hidden
                      />
                      {cli.name}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
