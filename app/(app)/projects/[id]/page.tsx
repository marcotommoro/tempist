import Link from "next/link";
import { LayoutGrid, List as ListIcon } from "lucide-react";

import { requireProjectAccess } from "@/lib/auth/project-access";
import { getProjectBoard } from "@/lib/domain/projects";
import { listProjectInvitations, listProjectMembers } from "@/lib/domain/project-members";
import { listClients } from "@/lib/domain/clients";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { getCommentCountByTask } from "@/lib/domain/comments";
import { ProjectClientSelect } from "@/components/features/projects/project-client-select";
import { ProjectDescription } from "@/components/features/projects/project-description";
import { ProjectEditableTitle } from "@/components/features/projects/project-editable-title";
import { ProjectMembersButton } from "@/components/features/projects/members/project-members-button";
import { TaskItem } from "@/components/features/tasks/task-item";
import { AddTaskToProject } from "@/components/features/tasks/add-task-to-project";
import { CreateSectionForm } from "@/components/features/projects/create-section-form";
import { ProjectBoard } from "@/components/features/projects/board/board";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/features/page-header/page-header";
import { userTimezone } from "@/lib/utils/default-task-scheduled-at";

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
  const access = await requireProjectAccess(id);
  const { user, project, accessType, role } = access;
  const organizationId = project.organizationId;
  const canEdit = role === "editor";
  const canManageMembers = accessType === "workspace";

  const [{ sections, tasksBySection }, clients, projectMembers, pendingInvitations] =
    await Promise.all([
      getProjectBoard({ projectId: id, organizationId }),
      // Per gli esterni non mostriamo i client del workspace (non sono autorizzati a vederli)
      accessType === "workspace" ? listClients({ organizationId }) : Promise.resolve([]),
      listProjectMembers(id),
      accessType === "workspace" ? listProjectInvitations(id) : Promise.resolve([]),
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
  const taskCount = allTaskIds.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <ProjectEditableTitle
            projectId={id}
            initialName={project.name}
            canEdit={canEdit}
          />
        }
        meta={
          <>
            <span>
              <span className="text-foreground tabular-nums">{taskCount}</span>{" "}
              {taskCount === 1 ? "task" : "tasks"}
            </span>
            <span aria-hidden>·</span>
            <span>
              <span className="text-foreground tabular-nums">{sections.length}</span>{" "}
              {sections.length === 1 ? "section" : "sections"}
            </span>
          </>
        }
        actions={<ViewToggle isBoard={isBoard} projectId={id} />}
      />

      <ProjectDescription
        projectId={id}
        initialDescription={project.descriptionMarkdown}
        canEdit={canEdit}
      />

      <div className="flex flex-wrap items-center gap-3">
        {accessType === "workspace" && (
          <ProjectClientSelect
            projectId={id}
            currentClientId={project.clientId}
            clients={clients}
          />
        )}
        <ProjectMembersButton
          projectId={id}
          projectName={project.name}
          members={projectMembers}
          invitations={pendingInvitations}
          canManage={canManageMembers}
          currentUserId={user.id}
        />
      </div>

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
          timezone={userTimezone(user)}
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
    <div className="inline-flex rounded-md border border-border bg-card/40 p-0.5 font-mono text-[0.625em] uppercase tracking-wider">
      <Link
        href={`/projects/${projectId}`}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 transition-colors",
          !isBoard
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ListIcon className="size-3" /> List
      </Link>
      <Link
        href={`/projects/${projectId}?view=board`}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 transition-colors",
          isBoard
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="size-3" /> Board
      </Link>
    </div>
  );
}

function ListView({
  projectId,
  projectName,
  projectColor,
  currentUserId,
  timezone,
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
  timezone: string;
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
          timezone={timezone}
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
          timezone={timezone}
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
  timezone,
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
  timezone: string;
  sectionId: string | null;
  tasks: import("@/lib/db/schema").Task[];
  trackedByTask: Map<string, number>;
  remindersByTask: Map<string, number>;
  commentsByTask: Map<string, number>;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between border-b border-border pb-1.5">
        <h2 className="section-heading text-muted-foreground">
          {name}
        </h2>
        <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
          {String(tasks.length).padStart(2, "0")}
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card">
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
          <p className="px-3 py-3 font-serif text-sm italic text-muted-foreground">
            Nessun task.
          </p>
        )}
        <div className="border-t border-border">
          <AddTaskToProject
            projectId={projectId}
            sectionId={sectionId}
            timezone={timezone}
          />
        </div>
      </div>
    </section>
  );
}
