import Link from "next/link";
import { Star } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listProjects } from "@/lib/domain/projects";
import { listClients } from "@/lib/domain/clients";
import { CreateProjectForm } from "@/components/features/projects/create-project-form";
import { EntityColorMarker } from "@/components/features/entity-color-marker";
import { PageHeader } from "@/components/features/page-header/page-header";

export default async function ProjectsPage() {
  const { organizationId } = await requireActiveOrganization();
  const [projects, clients] = await Promise.all([
    listProjects({ organizationId }),
    listClients({ organizationId }),
  ]);

  const clientById = new Map(clients.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        meta={
          <>
            <span>
              <span className="text-foreground tabular-nums">{projects.length}</span>{" "}
              total
            </span>
            {clients.length > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  <span className="text-foreground tabular-nums">{clients.length}</span>{" "}
                  {clients.length === 1 ? "client" : "clients"}
                </span>
              </>
            ) : null}
          </>
        }
        description={
          projects.length === 0
            ? "Nessun progetto. Creane uno qui sotto."
            : undefined
        }
      />

      <CreateProjectForm clients={clients} />

      {projects.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
          {projects.map((p) => {
            const cli = p.clientId ? clientById.get(p.clientId) : null;
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-accent/40"
                >
                  <EntityColorMarker kind="project" color={p.color} />
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  {p.isFavorite && (
                    <Star className="h-3 w-3 fill-coral text-coral" aria-hidden />
                  )}
                  {cli && (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-eyebrow">
                      <EntityColorMarker kind="client" color={cli.color} size="sm" />
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
