import { addDays, format, isSameDay, isToday, isTomorrow, parseISO, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  getOverdueTasks,
  getTasksInRange,
} from "@/lib/domain/tasks";
import { getTrackedSecondsByTask } from "@/lib/domain/time-entries";
import { getPendingReminderCountByTask } from "@/lib/domain/reminders";
import { getCommentCountByTask } from "@/lib/domain/comments";
import { listProjects } from "@/lib/domain/projects";
import { TaskList, type ProjectMeta } from "@/components/features/tasks/task-list";
import { OverdueSection } from "@/components/features/upcoming/overdue-section";
import {
  WeekDays,
  WeekStrip,
} from "@/components/features/upcoming/week-strip";
import { AddTaskForDay } from "@/components/features/upcoming/add-task-for-day";
import { groupByDay } from "@/lib/utils/group-by-day";
import { PageHeader } from "@/components/features/page-header/page-header";

const WEEKDAY_IT = [
  "domenica",
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
];

type Search = { cursor?: string };

function dayLabel(day: Date, todayLocal: Date): string {
  if (isSameDay(day, todayLocal)) return "Oggi";
  if (isTomorrow(day) && isSameDay(day, addDays(todayLocal, 1))) return "Domani";
  return WEEKDAY_IT[day.getDay()] ?? "";
}

export default async function UpcomingPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { cursor: cursorParam } = await searchParams;
  const { user, organizationId } = await requireActiveOrganization();
  const timezone =
    (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";

  // Cursor: data inizio del range mostrato. Default = oggi local.
  const now = new Date();
  const todayLocal = toZonedTime(now, timezone);
  const cursorLocal =
    cursorParam && /^\d{4}-\d{2}-\d{2}$/.test(cursorParam)
      ? parseISO(cursorParam)
      : todayLocal;

  // Mostriamo 14 giorni dalla settimana che contiene cursor (lunedì → +13)
  const rangeStartLocal = startOfWeek(cursorLocal, { weekStartsOn: 1 });
  const rangeEndLocal = addDays(rangeStartLocal, 14);

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
  const [trackedByTask, remindersByTask, commentsByTask, projects] = await Promise.all([
    getTrackedSecondsByTask({ organizationId, taskIds: allTaskIds }),
    getPendingReminderCountByTask(allTaskIds),
    getCommentCountByTask({ taskIds: allTaskIds }),
    listProjects({ organizationId }),
  ]);
  const projectsById = new Map<string, ProjectMeta>(
    projects.map((p) => [p.id, { name: p.name, color: p.color }]),
  );

  // Raggruppa per giorno locale
  const tasksByDay = groupByDay(rangeTasks, (t) => t.scheduledAt, timezone);

  // Lista 14 giorni consecutivi
  const days: Date[] = [];
  for (let i = 0; i < 14; i++) days.push(addDays(rangeStartLocal, i));

  const totalUpcoming = rangeTasks.length;
  const overdueCount = overdueTasks.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upcoming"
        meta={
          <>
            <span>
              <span className="text-foreground tabular-nums">{totalUpcoming}</span>{" "}
              scheduled
            </span>
            {overdueCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-destructive">
                  <span className="tabular-nums">{overdueCount}</span> overdue
                </span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span>{format(rangeStartLocal, "d LLL")} → {format(addDays(rangeStartLocal, 13), "d LLL")}</span>
          </>
        }
      />

      <div className="space-y-2">
        <WeekStrip cursorDate={cursorLocal} todayLocal={todayLocal} />
        <WeekDays cursorDate={cursorLocal} todayLocal={todayLocal} />
      </div>

      <OverdueSection
        tasks={overdueTasks}
        trackedByTask={trackedByTask}
        remindersByTask={remindersByTask}
        commentsByTask={commentsByTask}
        projectsById={projectsById}
        currentUserId={user.id}
      />

      <div className="space-y-5">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          const label = dayLabel(day, todayLocal);
          return (
            <section key={key} id={`day-${key}`} className="space-y-2">
              <div className="flex items-baseline gap-3 border-b border-border pb-1.5">
                <h2 className="font-display text-xl leading-none text-foreground">
                  {format(day, "d MMM")}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {isToday(day) ? "Oggi · " : isTomorrow(day) ? "Domani · " : ""}
                  {label}
                </span>
              </div>
              {dayTasks.length > 0 ? (
                <TaskList
                  tasks={dayTasks}
                  trackedByTask={trackedByTask}
                  remindersByTask={remindersByTask}
                  commentsByTask={commentsByTask}
                  projectsById={projectsById}
                  currentUserId={user.id}
                />
              ) : (
                <p className="px-1 font-display text-sm italic text-muted-foreground">
                  Nessuna attività.
                </p>
              )}
              <AddTaskForDay day={day} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
