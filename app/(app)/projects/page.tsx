import Link from "next/link";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listProjects } from "@/lib/domain/projects";
import { CreateProjectForm } from "@/components/features/projects/create-project-form";

export default async function ProjectsPage() {
  const { organizationId } = await requireActiveOrganization();
  const projects = await listProjects({ organizationId });

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

      <CreateProjectForm />

      {projects.length > 0 && (
        <ul className="divide-y divide-border rounded-md border bg-card">
          {projects.map((p) => (
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
