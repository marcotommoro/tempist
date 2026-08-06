import Link from "next/link";
import { addDays, parseISO, startOfWeek } from "date-fns";
import { LayoutGrid, List as ListIcon } from "lucide-react";

import { requireProjectAccess } from "@/lib/auth/project-access";
import { getProjectBoard } from "@/lib/domain/projects";
import { listProjectInvitations, listProjectMembers } from "@/lib/domain/project-members";
import { listClients } from "@/lib/domain/clients";
import {
  getRunningTimer,
  getTrackedSecondsByTask,
  listQuickGridDataForProject,
} from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { getCommentCountByTask } from "@/lib/domain/comments";
import { ProjectClientSelect } from "@/components/features/projects/project-client-select";
import { ProjectColorSelect } from "@/components/features/projects/project-color-select";
import { ProjectDescription } from "@/components/features/projects/project-description";
import { ProjectEditableTitle } from "@/components/features/projects/project-editable-title";
import { ProjectMembersButton } from "@/components/features/projects/members/project-members-button";
import { TaskItem } from "@/components/features/tasks/task-item";
import { CreateTaskDialog } from "@/components/features/tasks/create-task-dialog";
import { CreateSectionForm } from "@/components/features/projects/create-section-form";
import { ProjectBoard } from "@/components/features/projects/board/board";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/features/page-header/page-header";
import { QuickStartButton } from "@/components/features/timer/quick-start-button";
import { ProjectQuickEntryGrid } from "@/components/features/timer/project-quick-entry-grid";
import { userTimezone } from "@/lib/utils/default-task-scheduled-at";

type Params = { id: string };
type Search = { view?: string; week?: string };

function safeParse(s: string): Date | null {
  const d = parseISO(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { view } = sp;
  const access = await requireProjectAccess(id);
  const { user, project, accessType, role } = access;
  const organizationId = project.organizationId;
  const canEdit = role === "editor";
  const canManageMembers = accessType === "workspace";

  const weekStart = sp.week
    ? (safeParse(sp.week) ?? startOfWeek(new Date(), { weekStartsOn: 1 }))
    : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  const [{ sections, tasksBySection }, clients, projectMembers, pendingInvitations, quickGrid] =
    await Promise.all([
      getProjectBoard({ projectId: id, organizationId }),
      accessType === "workspace" ? listClients({ organizationId }) : Promise.resolve([]),
      listProjectMembers(id),
      accessType === "workspace" ? listProjectInvitations(id) : Promise.resolve([]),
      listQuickGridDataForProject({
        organizationId,
        userId: user.id,
        projectId: id,
        weekStart,
        weekEnd,
      }),
    ]);

  // Flat list di taskIds da tutte le sezioni (incluso "null" = senza sezione)
  const allTaskIds: string[] = [];
  for (const arr of tasksBySection.values()) {
    for (const t of arr) allTaskIds.push(t.id);
  }
  const [trackedByTask, remindersByTask, commentsByTask, runningTimer] =
    await Promise.all([
      getTrackedSecondsByTask({ organizationId, taskIds: allTaskIds }),
      getPendingReminderCountByTask(allTaskIds),
      getCommentCountByTask({ taskIds: allTaskIds }),
      getRunningTimer({ userId: user.id, organizationId }),
    ]);

  // Se il timer in corso è agganciato a un task di questo progetto, il suo
  // totale dovrà scorrere live (vedi TaskItem.runningSince).
  const runningTaskId = runningTimer?.taskId ?? null;
  const runningStartedAt = runningTimer?.startedAt ?? null;

  const isBoard = view === "board";
  const taskCount = allTaskIds.length;

  const projectTasks: { id: string; name: string }[] = [];
  for (const arr of tasksBySection.values()) {
    for (const t of arr) {
      projectTasks.push({ id: t.id, name: t.title });
    }
  }

  const managedByCell = new Map<string, number>();
  for (const m of quickGrid.managed) {
    const key = `${m.dayKey}::${m.taskId ?? ""}`;
    managedByCell.set(key, (managedByCell.get(key) ?? 0) + m.durationSeconds);
  }
  const gridCells = quickGrid.summary.map((s) => ({
    dayKey: s.dayKey,
    taskId: s.taskId,
    totalSeconds: s.totalSeconds,
    managedSeconds: managedByCell.get(`${s.dayKey}::${s.taskId ?? ""}`) ?? 0,
  }));

  const preservedWeekParams: Record<string, string> = {};
  if (sp.view) preservedWeekParams.view = sp.view;

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
        actions={
          <div className="flex items-center gap-2">
            {accessType === "workspace" && (
              <QuickStartButton
                target={{ kind: "project", id, label: project.name }}
              />
            )}
            <ViewToggle isBoard={isBoard} projectId={id} />
          </div>
        }
      />

      <ProjectDescription
        projectId={id}
        initialDescription={project.descriptionMarkdown}
        canEdit={canEdit}
      />

      <div className="flex flex-wrap items-center gap-3">
        <ProjectColorSelect
          projectId={id}
          initialColor={project.color}
          canEdit={canEdit}
        />
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

      <ProjectQuickEntryGrid
        projectId={id}
        tasks={projectTasks}
        weekStart={weekStart}
        cells={gridCells}
        basePath={`/projects/${id}`}
        preservedParams={preservedWeekParams}
      />

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
          runningTaskId={runningTaskId}
          runningStartedAt={runningStartedAt}
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
  runningTaskId,
  runningStartedAt,
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
  runningTaskId: string | null;
  runningStartedAt: Date | null;
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
          runningTaskId={runningTaskId}
          runningStartedAt={runningStartedAt}
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
          runningTaskId={runningTaskId}
          runningStartedAt={runningStartedAt}
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
  runningTaskId,
  runningStartedAt,
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
  runningTaskId: string | null;
  runningStartedAt: Date | null;
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
                runningSince={runningTaskId === t.id ? runningStartedAt : null}
              />
            ))}
          </ul>
        ) : (
          <p className="px-3 py-3 font-serif text-sm italic text-muted-foreground">
            Nessun task.
          </p>
        )}
        <div className="border-t border-border">
          <CreateTaskDialog
            defaultProjectId={projectId}
            defaultSectionId={sectionId}
            timezone={timezone}
          />
        </div>
      </div>
    </section>
  );
}
