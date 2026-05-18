import Link from "next/link";
import { notFound } from "next/navigation";
import { LayoutGrid, List as ListIcon } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getProject, getProjectBoard } from "@/lib/domain/projects";
import { listClients } from "@/lib/domain/clients";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { getCommentCountByTask } from "@/lib/domain/comments";
import { ProjectClientSelect } from "@/components/features/projects/project-client-select";
import { TaskItem } from "@/components/features/tasks/task-item";
import { AddTaskToProject } from "@/components/features/tasks/add-task-to-project";
import { CreateSectionForm } from "@/components/features/projects/create-section-form";
import { ProjectBoard } from "@/components/features/projects/board/board";
import { cn } from "@/lib/utils";

type Params = { id: string };
type Search = { view?: string };

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const [{ id }, { view }] = await Promise.all([params, searchParams]);
  const { user, organizationId } = await requireActiveOrganization();
  const project = await getProject({ projectId: id, organizationId });
  if (!project) notFound();

  const [{ sections, tasksBySection }, clients] = await Promise.all([
    getProjectBoard({ projectId: id, organizationId }),
    listClients({ organizationId }),
  ]);

  // Flat list di taskIds da tutte le sezioni (incluso "null" = senza sezione)
  const allTaskIds: string[] = [];
  for (const arr of tasksBySection.values()) {
    for (const t of arr) allTaskIds.push(t.id);
  }
  const [trackedByTask, remindersByTask, commentsByTask] = await Promise.all([
    getTrackedSecondsByTask({ organizationId, taskIds: allTaskIds }),
    getPendingReminderCountByTask(allTaskIds),
    getCommentCountByTask({ taskIds: allTaskIds }),
  ]);

  const isBoard = view === "board";

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
            aria-hidden
          />
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ViewToggle isBoard={isBoard} projectId={id} />
          <ProjectClientSelect
            projectId={id}
            currentClientId={project.clientId}
            clients={clients}
          />
        </div>
      </header>

      {isBoard ? (
        <ProjectBoard
          projectId={id}
          sections={sections}
          initialTasksBySection={tasksBySection}
        />
      ) : (
        <ListView
          projectId={id}
          projectName={project.name}
          projectColor={project.color}
          currentUserId={user.id}
          sections={sections}
          tasksBySection={tasksBySection}
          trackedByTask={trackedByTask}
          remindersByTask={remindersByTask}
          commentsByTask={commentsByTask}
        />
      )}
    </div>
  );
}

function ViewToggle({ isBoard, projectId }: { isBoard: boolean; projectId: string }) {
  return (
    <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
      <Link
        href={`/projects/${projectId}`}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded",
          !isBoard ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
        )}
      >
        <ListIcon className="size-3.5" /> List
      </Link>
      <Link
        href={`/projects/${projectId}?view=board`}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded",
          isBoard ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
        )}
      >
        <LayoutGrid className="size-3.5" /> Board
      </Link>
    </div>
  );
}

function ListView({
  projectId,
  projectName,
  projectColor,
  currentUserId,
  sections,
  tasksBySection,
  trackedByTask,
  remindersByTask,
  commentsByTask,
}: {
  projectId: string;
  projectName: string;
  projectColor: string;
  currentUserId: string;
  sections: import("@/lib/db/schema").Section[];
  tasksBySection: Map<string | null, import("@/lib/db/schema").Task[]>;
  trackedByTask: Map<string, number>;
  remindersByTask: Map<string, number>;
  commentsByTask: Map<string, number>;
}) {
  const tasksNoSection = tasksBySection.get(null) ?? [];

  return (
    <>
      {(tasksNoSection.length > 0 || sections.length === 0) && (
        <SectionBlock
          name="Senza sezione"
          projectId={projectId}
          projectName={projectName}
          projectColor={projectColor}
          currentUserId={currentUserId}
          sectionId={null}
          tasks={tasksNoSection}
          trackedByTask={trackedByTask}
          remindersByTask={remindersByTask}
          commentsByTask={commentsByTask}
        />
      )}
      {sections.map((s) => (
        <SectionBlock
          key={s.id}
          name={s.name}
          projectId={projectId}
          projectName={projectName}
          projectColor={projectColor}
          currentUserId={currentUserId}
          sectionId={s.id}
          tasks={tasksBySection.get(s.id) ?? []}
          trackedByTask={trackedByTask}
          remindersByTask={remindersByTask}
          commentsByTask={commentsByTask}
        />
      ))}
      <div>
        <CreateSectionForm projectId={projectId} />
      </div>
    </>
  );
}

function SectionBlock({
  name,
  projectId,
  projectName,
  projectColor,
  currentUserId,
  sectionId,
  tasks,
  trackedByTask,
  remindersByTask,
  commentsByTask,
}: {
  name: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  currentUserId: string;
  sectionId: string | null;
  tasks: import("@/lib/db/schema").Task[];
  trackedByTask: Map<string, number>;
  remindersByTask: Map<string, number>;
  commentsByTask: Map<string, number>;
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
              <TaskItem
                key={t.id}
                task={t}
                trackedSeconds={trackedByTask.get(t.id) ?? 0}
                reminderCount={remindersByTask.get(t.id) ?? 0}
                commentCount={commentsByTask.get(t.id) ?? 0}
                projectName={projectName}
                projectColor={projectColor}
                currentUserId={currentUserId}
              />
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
