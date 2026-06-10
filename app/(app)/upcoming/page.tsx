import {
  addDays,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  getOverdueTasks,
  getSubtaskCountsByParent,
  getTasksInRange,
} from "@/lib/domain/tasks";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { getCommentCountByTask } from "@/lib/domain/comments";
import { listProjects } from "@/lib/domain/projects";
import { listClients } from "@/lib/domain/clients";
import { TaskListByGroup } from "@/components/features/tasks/task-list-by-group";
import { TaskListViewToggle } from "@/components/features/tasks/task-list-view-toggle";
import { type ProjectMeta } from "@/components/features/tasks/task-list";
import { OverdueSection } from "@/components/features/upcoming/overdue-section";
import { AddTaskForDay } from "@/components/features/upcoming/add-task-for-day";
import {
  UpcomingDaysBoard,
  type UpcomingDay,
} from "@/components/features/upcoming/upcoming-days-board";
import { parseTaskGroupMode } from "@/lib/utils/group-by-project";
import {
  WeekDays,
  WeekStrip,
} from "@/components/features/upcoming/week-strip";
import { CreateTaskDialog } from "@/components/features/tasks/create-task-dialog";
import { groupByDay } from "@/lib/utils/group-by-day";
import { buildClientByTask } from "@/lib/utils/client-by-task";
import {
  defaultTaskScheduledAt,
  userTimezone,
} from "@/lib/utils/default-task-scheduled-at";
import { PageHeader } from "@/components/features/page-header/page-header";

const DAYS_SHOWN = 7;

const WEEKDAY_IT = [
  "domenica",
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
];

type Search = { cursor?: string; group?: string };

function dayEyebrow(day: Date, todayLocal: Date): string {
  const weekday = WEEKDAY_IT[day.getDay()] ?? "";
  if (isSameDay(day, todayLocal)) return `Oggi · ${weekday}`;
  if (isSameDay(day, addDays(todayLocal, 1))) return `Domani · ${weekday}`;
  return weekday;
}

export default async function UpcomingPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { cursor: cursorParam, group: groupParam } = await searchParams;
  const group = parseTaskGroupMode(groupParam);
  const preserveParams =
    cursorParam && /^\d{4}-\d{2}-\d{2}$/.test(cursorParam)
      ? { cursor: cursorParam }
      : undefined;
  const { user, organizationId } = await requireActiveOrganization();
  const timezone = userTimezone(user);
  const defaultScheduledAt = defaultTaskScheduledAt(timezone);

  // Cursor: data inizio del range mostrato. Default = oggi local.
  const now = new Date();
  const todayLocal = toZonedTime(now, timezone);
  const cursorLocal =
    cursorParam && /^\d{4}-\d{2}-\d{2}$/.test(cursorParam)
      ? parseISO(cursorParam)
      : todayLocal;

  // Una settimana: da inizio di oggi se il cursore è oggi (startOfDay, non
  // l'istante corrente: altrimenti le task già pianificate per oggi più presto
  // dell'ora attuale sparirebbero dal range), altrimenti dal lunedì della
  // settimana del cursore.
  const rangeStartLocal = isSameDay(cursorLocal, todayLocal)
    ? startOfDay(todayLocal)
    : startOfWeek(cursorLocal, { weekStartsOn: 1 });
  const rangeEndLocal = addDays(rangeStartLocal, DAYS_SHOWN);

  const rangeStartUtc = fromZonedTime(rangeStartLocal, timezone);
  const rangeEndUtc = fromZonedTime(rangeEndLocal, timezone);

  const [overdueTasks, rangeTasks] = await Promise.all([
    getOverdueTasks({ organizationId, timezone }),
    getTasksInRange({
      organizationId,
      from: rangeStartUtc,
      to: rangeEndUtc,
    }),
  ]);

  const allTaskIds = [
    ...overdueTasks.map((t) => t.id),
    ...rangeTasks.map((t) => t.id),
  ];
  const [
    trackedByTask,
    remindersByTask,
    commentsByTask,
    subtaskCountsByTask,
    projects,
    clients,
  ] = await Promise.all([
    getTrackedSecondsByTask({ organizationId, taskIds: allTaskIds }),
    getPendingReminderCountByTask(allTaskIds),
    getCommentCountByTask({ taskIds: allTaskIds }),
    getSubtaskCountsByParent({ organizationId, taskIds: allTaskIds }),
    listProjects({ organizationId }),
    listClients({ organizationId }),
  ]);
  const projectsById = new Map<string, ProjectMeta>(
    projects.map((p) => [p.id, { name: p.name, color: p.color }]),
  );
  const clientByTask = buildClientByTask(
    [...overdueTasks, ...rangeTasks],
    projects,
    clients,
  );

  // Raggruppa per giorno locale
  const tasksByDayMap = groupByDay(rangeTasks, (t) => t.scheduledAt, timezone);

  // Lista giorni consecutivi della settimana mostrata
  const days: Date[] = [];
  for (let i = 0; i < DAYS_SHOWN; i++) days.push(addDays(rangeStartLocal, i));

  const boardDays: UpcomingDay[] = days.map((day) => ({
    key: format(day, "yyyy-MM-dd"),
    heading: format(day, "d MMM"),
    eyebrow: dayEyebrow(day, todayLocal),
  }));
  const tasksByDay = Object.fromEntries(
    boardDays.map((d) => [d.key, tasksByDayMap.get(d.key) ?? []]),
  );

  const totalUpcoming = rangeTasks.length;
  const overdueCount = overdueTasks.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attività"
        meta={
          <>
            <span>
              <span className="text-foreground tabular-nums">{totalUpcoming}</span>{" "}
              pianificate
            </span>
            {overdueCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-destructive">
                  <span className="tabular-nums">{overdueCount}</span> scadute
                </span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span>{format(rangeStartLocal, "d LLL")} → {format(addDays(rangeStartLocal, DAYS_SHOWN - 1), "d LLL")}</span>
          </>
        }
        actions={
          <TaskListViewToggle
            basePath="/upcoming"
            group={group}
            preserveParams={preserveParams}
          />
        }
      />

      <CreateTaskDialog
        defaultScheduledAt={defaultScheduledAt}
        timezone={timezone}
        projects={projects}
        clients={clients}
      />

      <div className="space-y-2">
        <WeekStrip cursorDate={cursorLocal} todayLocal={todayLocal} group={group} />
        <WeekDays cursorDate={cursorLocal} todayLocal={todayLocal} />
      </div>

      <OverdueSection
        tasks={overdueTasks}
        group={group}
        projects={projects}
        trackedByTask={trackedByTask}
        remindersByTask={remindersByTask}
        commentsByTask={commentsByTask}
        subtaskCountsByTask={subtaskCountsByTask}
        projectsById={projectsById}
        clientByTask={clientByTask}
        currentUserId={user.id}
      />

      {group === "flat" ? (
        <UpcomingDaysBoard
          days={boardDays}
          tasksByDay={tasksByDay}
          timezone={timezone}
          trackedByTask={trackedByTask}
          remindersByTask={remindersByTask}
          commentsByTask={commentsByTask}
          subtaskCountsByTask={subtaskCountsByTask}
          projectsById={projectsById}
          clientByTask={clientByTask}
          currentUserId={user.id}
        />
      ) : (
        <div className="space-y-5">
          {boardDays.map((day) => {
            const dayTasks = tasksByDay[day.key] ?? [];
            return (
              <section key={day.key} id={`day-${day.key}`} className="space-y-2">
                <div className="flex items-baseline gap-3 border-b border-border pb-1.5">
                  <h2 className="font-display text-xl leading-none text-foreground">
                    {day.heading}
                  </h2>
                  <span className="text-eyebrow">{day.eyebrow}</span>
                </div>
                {dayTasks.length > 0 ? (
                  <TaskListByGroup
                    group={group}
                    tasks={dayTasks}
                    projects={projects}
                    trackedByTask={trackedByTask}
                    remindersByTask={remindersByTask}
                    commentsByTask={commentsByTask}
                    subtaskCountsByTask={subtaskCountsByTask}
                    projectsById={projectsById}
                    clientByTask={clientByTask}
                    currentUserId={user.id}
                  />
                ) : (
                  <p className="px-1 font-serif text-sm italic text-muted-foreground">
                    Nessuna attività.
                  </p>
                )}
                <AddTaskForDay dayKey={day.key} timezone={timezone} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
