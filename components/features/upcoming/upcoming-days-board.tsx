"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { parseISO } from "date-fns";
import { Plus } from "lucide-react";

import type { Task } from "@/lib/db/schema";
import { setTaskScheduledAtAction } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import type { ClientMeta } from "@/lib/utils/client-by-task";
import { TaskItem } from "@/components/features/tasks/task-item";
import { type ProjectMeta } from "@/components/features/tasks/task-list";
import { CreateTaskDialog } from "@/components/features/tasks/create-task-dialog";

export type UpcomingDay = {
  /** yyyy-MM-dd locale, usato come id droppable e anchor #day-… */
  key: string;
  /** Es. "10 giu" */
  heading: string;
  /** Es. "Oggi · martedì" */
  eyebrow: string;
};

type DayColumns = Record<string, Task[]>;

/**
 * Board verticale dei prossimi giorni con drag&drop delle task tra un giorno
 * e l'altro. Lo spostamento mantiene l'orario originale del task e cambia solo
 * il giorno (persistito via setTaskScheduledAtAction). Aggiornamento ottimista
 * con rollback in caso di errore; lo stato locale si risincronizza quando il
 * server rivalida e arrivano prop fresche.
 */
export function UpcomingDaysBoard({
  days,
  tasksByDay,
  timezone,
  trackedByTask,
  remindersByTask,
  commentsByTask,
  projectsById,
  clientByTask,
  currentUserId,
}: {
  days: UpcomingDay[];
  tasksByDay: Record<string, Task[]>;
  timezone: string;
  trackedByTask?: Map<string, number>;
  remindersByTask?: Map<string, number>;
  commentsByTask?: Map<string, number>;
  projectsById?: Map<string, ProjectMeta>;
  clientByTask?: Map<string, ClientMeta>;
  currentUserId?: string;
}) {
  const initialColumns = useMemo(() => {
    const cols: DayColumns = {};
    for (const d of days) cols[d.key] = tasksByDay[d.key] ?? [];
    return cols;
  }, [days, tasksByDay]);

  const [columns, setColumns] = useState<DayColumns>(initialColumns);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [, startTransition] = useTransition();
  // Giorno di partenza del drag corrente (per capire se è cambiato al drop).
  const originDayRef = useRef<string | null>(null);

  // Risincronizza con i dati server dopo ogni revalidate (props nuove):
  // adjust-state-during-render, l'alternativa sanzionata da React all'effect.
  const [syncedInitial, setSyncedInitial] = useState(initialColumns);
  if (syncedInitial !== initialColumns) {
    setSyncedInitial(initialColumns);
    setColumns(initialColumns);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function findDayOfTask(taskId: string): string | null {
    for (const key of Object.keys(columns)) {
      if (columns[key]?.some((t) => t.id === taskId)) return key;
    }
    return null;
  }

  function resolveDay(overId: string): string | null {
    if (overId in columns) return overId;
    return findDayOfTask(overId);
  }

  function handleDragStart(e: DragStartEvent) {
    const taskId = String(e.active.id);
    const day = findDayOfTask(taskId);
    originDayRef.current = day;
    const task = day ? columns[day]?.find((t) => t.id === taskId) : undefined;
    setActiveTask(task ?? null);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const fromDay = findDayOfTask(activeId);
    const toDay = resolveDay(String(over.id));
    if (!fromDay || !toDay || fromDay === toDay) return;

    setColumns((prev) => {
      const from = prev[fromDay] ?? [];
      const to = prev[toDay] ?? [];
      const task = from.find((t) => t.id === activeId);
      if (!task) return prev;
      return {
        ...prev,
        [fromDay]: from.filter((t) => t.id !== activeId),
        [toDay]: [...to, task],
      };
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active } = e;
    setActiveTask(null);
    const activeId = String(active.id);
    const originDay = originDayRef.current;
    originDayRef.current = null;

    const targetDay = findDayOfTask(activeId);
    if (!targetDay || !originDay || targetDay === originDay) return;

    const task = columns[targetDay]?.find((t) => t.id === activeId);
    if (!task) return;

    // Nuova data: giorno target, stesso orario del task (default 09:00).
    const next = parseISO(targetDay);
    if (task.scheduledAt) {
      const prev = new Date(task.scheduledAt);
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
    } else {
      next.setHours(9, 0, 0, 0);
    }

    startTransition(async () => {
      const res = await setTaskScheduledAtAction(task.id, next.toISOString());
      if (!res.ok) {
        console.error("[upcoming] spostamento fallito:", res.error);
        setColumns(initialColumns);
      }
    });
  }

  function handleDragCancel() {
    setActiveTask(null);
    originDayRef.current = null;
    setColumns(initialColumns);
  }

  const activeMeta = activeTask
    ? {
        project: activeTask.projectId
          ? projectsById?.get(activeTask.projectId)
          : undefined,
        client: clientByTask?.get(activeTask.id),
      }
    : null;

  return (
    <DndContext
      // Id stabile: senza, l'id autogenerato (aria-describedby) diverge tra
      // SSR e client e causa hydration mismatch.
      id="upcoming-days-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-5">
        {days.map((day) => (
          <DaySection
            key={day.key}
            day={day}
            tasks={columns[day.key] ?? []}
            timezone={timezone}
            trackedByTask={trackedByTask}
            remindersByTask={remindersByTask}
            commentsByTask={commentsByTask}
            projectsById={projectsById}
            clientByTask={clientByTask}
            currentUserId={currentUserId}
            activeTaskId={activeTask?.id ?? null}
          />
        ))}
      </div>
      <DragOverlay
        dropAnimation={{
          duration: 220,
          easing: "cubic-bezier(0.2, 0.7, 0.3, 1.05)",
        }}
      >
        {activeTask ? (
          <ul className="rotate-1 scale-[1.02] list-none overflow-hidden rounded-lg border border-coral/60 bg-card shadow-xl ring-4 ring-coral/15 cursor-grabbing">
            <TaskItem
              task={activeTask}
              trackedSeconds={trackedByTask?.get(activeTask.id) ?? 0}
              commentCount={commentsByTask?.get(activeTask.id) ?? 0}
              projectName={activeMeta?.project?.name ?? null}
              projectColor={activeMeta?.project?.color ?? null}
              clientName={activeMeta?.client?.name ?? null}
              clientColor={activeMeta?.client?.color ?? null}
            />
          </ul>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DaySection({
  day,
  tasks,
  timezone,
  trackedByTask,
  remindersByTask,
  commentsByTask,
  projectsById,
  clientByTask,
  currentUserId,
  activeTaskId,
}: {
  day: UpcomingDay;
  tasks: Task[];
  timezone: string;
  trackedByTask?: Map<string, number>;
  remindersByTask?: Map<string, number>;
  commentsByTask?: Map<string, number>;
  projectsById?: Map<string, ProjectMeta>;
  clientByTask?: Map<string, ClientMeta>;
  currentUserId?: string;
  activeTaskId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.key });

  const incomplete = tasks.filter((t) => !t.completedAt);
  const completed = tasks.filter((t) => t.completedAt);

  // Default creazione: giorno alle 09:00 locali (come il vecchio AddTaskForDay).
  const dayAt9 = parseISO(day.key);
  dayAt9.setHours(9, 0, 0, 0);

  return (
    <section id={`day-${day.key}`} className="space-y-2">
      <div className="flex items-baseline gap-3 border-b border-border pb-1.5">
        <h2 className="font-display text-xl leading-none text-foreground">
          {day.heading}
        </h2>
        <span className="text-eyebrow">{day.eyebrow}</span>
      </div>
      <SortableContext
        items={incomplete.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "rounded-lg transition-shadow duration-[var(--dur-fast)]",
            isOver && "ring-2 ring-coral/50 ring-offset-2 ring-offset-background",
          )}
        >
          {incomplete.length > 0 ? (
            <ul className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-xs">
              {incomplete.map((t) => (
                <SortableTaskItem
                  key={t.id}
                  task={t}
                  trackedSeconds={trackedByTask?.get(t.id) ?? 0}
                  reminderCount={remindersByTask?.get(t.id) ?? 0}
                  commentCount={commentsByTask?.get(t.id) ?? 0}
                  projectMeta={
                    t.projectId ? projectsById?.get(t.projectId) : undefined
                  }
                  clientMeta={clientByTask?.get(t.id)}
                  currentUserId={currentUserId}
                  hidden={t.id === activeTaskId}
                />
              ))}
            </ul>
          ) : (
            <p
              className={cn(
                "rounded-lg border border-dashed border-transparent px-3 py-2 font-serif text-sm italic text-muted-foreground",
                isOver && "border-coral/40 bg-coral/5",
              )}
            >
              {isOver ? "Rilascia qui per spostare." : "Nessuna attività."}
            </p>
          )}
        </div>
      </SortableContext>
      {completed.length > 0 && (
        <ul className="overflow-hidden rounded-lg border border-border/80 bg-card/80 shadow-xs">
          {completed.map((t) => {
            const projectMeta = t.projectId
              ? projectsById?.get(t.projectId)
              : undefined;
            const clientMeta = clientByTask?.get(t.id);
            return (
              <TaskItem
                key={t.id}
                task={t}
                trackedSeconds={trackedByTask?.get(t.id) ?? 0}
                reminderCount={remindersByTask?.get(t.id) ?? 0}
                commentCount={commentsByTask?.get(t.id) ?? 0}
                projectName={projectMeta?.name ?? null}
                projectColor={projectMeta?.color ?? null}
                clientName={clientMeta?.name ?? null}
                clientColor={clientMeta?.color ?? null}
                currentUserId={currentUserId}
              />
            );
          })}
        </ul>
      )}
      <CreateTaskDialog
        defaultScheduledAt={dayAt9}
        timezone={timezone}
        trigger={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[0.625em] uppercase tracking-wider text-muted-foreground transition-colors hover:text-coral"
          >
            <Plus className="size-3" /> Aggiungi attività
          </button>
        }
      />
    </section>
  );
}

function SortableTaskItem({
  task,
  trackedSeconds,
  reminderCount,
  commentCount,
  projectMeta,
  clientMeta,
  currentUserId,
  hidden,
}: {
  task: Task;
  trackedSeconds: number;
  reminderCount: number;
  commentCount: number;
  projectMeta?: ProjectMeta;
  clientMeta?: ClientMeta;
  currentUserId?: string;
  hidden: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });

  return (
    <TaskItem
      task={task}
      trackedSeconds={trackedSeconds}
      reminderCount={reminderCount}
      commentCount={commentCount}
      projectName={projectMeta?.name ?? null}
      projectColor={projectMeta?.color ?? null}
      clientName={clientMeta?.name ?? null}
      clientColor={clientMeta?.color ?? null}
      currentUserId={currentUserId}
      liRef={setNodeRef}
      liStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
        // La card "fantasma" resta nel flusso mentre l'overlay segue il mouse.
        opacity: hidden ? 0.3 : undefined,
        cursor: "grab",
      }}
      liProps={{ ...attributes, ...listeners }}
    />
  );
}
