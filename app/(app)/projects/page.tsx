import Link from "next/link";
import { Star } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listProjects } from "@/lib/domain/projects";
import { listClients } from "@/lib/domain/clients";
import { CreateProjectForm } from "@/components/features/projects/create-project-form";
import { EntityColorMarker } from "@/components/features/entity-color-marker";
import { PageHeader } from "@/components/features/page-header/page-header";
import { QuickStartButton } from "@/components/features/timer/quick-start-button";

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
              <li key={p.id} className="group flex items-center gap-1">
                <Link
                  href={`/projects/${p.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-accent/40"
                >
                  <EntityColorMarker kind="project" color={p.color} />
                  <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                  {p.isFavorite && (
                    <Star className="h-3 w-3 shrink-0 fill-coral text-coral" aria-hidden />
                  )}
                  {cli && (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-eyebrow">
                      <EntityColorMarker kind="client" color={cli.color} size="sm" />
                      {cli.name}
                    </span>
                  )}
                </Link>
                <div className="pr-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <QuickStartButton
                    target={{ kind: "project", id: p.id, label: p.name }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
