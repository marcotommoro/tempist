import { notFound } from "next/navigation";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getProject, getProjectBoard } from "@/lib/domain/projects";
import { TaskItem } from "@/components/features/tasks/task-item";
import { AddTaskToProject } from "@/components/features/tasks/add-task-to-project";
import { CreateSectionForm } from "@/components/features/projects/create-section-form";

type Params = { id: string };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const { organizationId } = await requireActiveOrganization();
  const project = await getProject({ projectId: id, organizationId });
  if (!project) notFound();

  const { sections, tasksBySection } = await getProjectBoard({
    projectId: id,
    organizationId,
  });

  const tasksNoSection = tasksBySection.get(null) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
            aria-hidden
          />
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        </div>
      </header>

      {/* Tasks senza section (orfani del project) */}
      {(tasksNoSection.length > 0 || sections.length === 0) && (
        <SectionBlock
          name="Senza sezione"
          projectId={project.id}
          sectionId={null}
          tasks={tasksNoSection}
        />
      )}

      {/* Sezioni */}
      {sections.map((s) => (
        <SectionBlock
          key={s.id}
          name={s.name}
          projectId={project.id}
          sectionId={s.id}
          tasks={tasksBySection.get(s.id) ?? []}
        />
      ))}

      <div>
        <CreateSectionForm projectId={project.id} />
      </div>
    </div>
  );
}

function SectionBlock({
  name,
  projectId,
  sectionId,
  tasks,
}: {
  name: string;
  projectId: string;
  sectionId: string | null;
  tasks: import("@/lib/db/schema").Task[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {name} <span className="ml-1 text-xs">({tasks.length})</span>
      </h2>
      <div className="rounded-md border bg-card">
        {tasks.length > 0 ? (
          <ul className="divide-y divide-border">
            {tasks.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </ul>
        ) : (
          <p className="px-3 py-3 text-xs text-muted-foreground">Nessun task.</p>
        )}
        <div className="border-t border-border">
          <AddTaskToProject projectId={projectId} sectionId={sectionId} />
        </div>
      </div>
    </section>
  );
}
