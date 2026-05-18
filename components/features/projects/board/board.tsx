"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Section, Task } from "@/lib/db/schema";
import { moveTaskAction } from "@/lib/actions/task-move";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const NO_SECTION_KEY = "__no_section__";

type ColumnId = string; // sectionId | NO_SECTION_KEY
type ColumnsState = Record<ColumnId, Task[]>;

export function ProjectBoard({
  projectId,
  sections,
  initialTasksBySection,
}: {
  projectId: string;
  sections: Section[];
  initialTasksBySection: Map<string | null, Task[]>;
}) {
  const initialColumns: ColumnsState = useMemo(() => {
    const cols: ColumnsState = {};
    cols[NO_SECTION_KEY] = initialTasksBySection.get(null) ?? [];
    for (const s of sections) {
      cols[s.id] = initialTasksBySection.get(s.id) ?? [];
    }
    return cols;
  }, [sections, initialTasksBySection]);

  const [columns, setColumns] = useState<ColumnsState>(initialColumns);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function findColumnOfTask(taskId: string): ColumnId | null {
    for (const colId of Object.keys(columns)) {
      if (columns[colId]?.some((t) => t.id === taskId)) return colId;
    }
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    const taskId = String(e.active.id);
    const col = findColumnOfTask(taskId);
    if (!col) return;
    const task = columns[col]?.find((t) => t.id === taskId);
    if (task) setActiveTask(task);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const fromCol = findColumnOfTask(activeId);
    if (!fromCol) return;

    // overId puo' essere un taskId o un columnId (drop diretto su una colonna)
    const toCol = Object.keys(columns).includes(overId)
      ? overId
      : findColumnOfTask(overId);
    if (!toCol || toCol === fromCol) return;

    setColumns((prev) => {
      const from = prev[fromCol] ?? [];
      const to = prev[toCol] ?? [];
      const task = from.find((t) => t.id === activeId);
      if (!task) return prev;
      return {
        ...prev,
        [fromCol]: from.filter((t) => t.id !== activeId),
        [toCol]: [...to, task],
      };
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveTask(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const col = findColumnOfTask(activeId);
    if (!col) return;

    let newColumns = columns;
    // Riordina nella stessa colonna se overId e' un altro taskId della stessa colonna
    const inSameCol = columns[col]?.some((t) => t.id === overId);
    if (inSameCol) {
      const items = columns[col] ?? [];
      const oldIndex = items.findIndex((t) => t.id === activeId);
      const newIndex = items.findIndex((t) => t.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        newColumns = { ...columns, [col]: arrayMove(items, oldIndex, newIndex) };
        setColumns(newColumns);
      }
    }

    // Persisti su server
    const ordered = newColumns[col] ?? [];
    const toSectionId = col === NO_SECTION_KEY ? null : col;
    startTransition(async () => {
      const res = await moveTaskAction({
        taskId: activeId,
        toSectionId,
        orderedTaskIds: ordered.map((t) => t.id),
        projectId,
      });
      if (!res.ok) {
        console.error("[board] move failed:", res.error);
        // Rollback: ricarica lo stato iniziale
        setColumns(initialColumns);
      }
    });
  }

  return (
    <div className={cn("relative", pending && "opacity-90")}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          <Column
            id={NO_SECTION_KEY}
            title="Senza sezione"
            tasks={columns[NO_SECTION_KEY] ?? []}
          />
          {sections.map((s) => (
            <Column
              key={s.id}
              id={s.id}
              title={s.name}
              tasks={columns[s.id] ?? []}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <Card task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  id,
  title,
  tasks,
}: {
  id: string;
  title: string;
  tasks: Task[];
}) {
  // Il SortableContext registra gli ID dei child droppable.
  const taskIds = tasks.map((t) => t.id);
  return (
    <div
      id={id}
      className="flex flex-col w-72 shrink-0 rounded-md border bg-muted/30 p-3"
    >
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {title}
          <span className="ml-1.5 text-xs text-muted-foreground">
            ({tasks.length})
          </span>
        </h3>
      </header>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div data-column-id={id} className="space-y-2 min-h-12">
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card task={task} />
    </div>
  );
}

const PRIORITY_DOT: Record<Task["priority"], string> = {
  P1: "bg-red-500",
  P2: "bg-orange-500",
  P3: "bg-blue-500",
  P4: "bg-muted-foreground/40",
};

function Card({ task, dragging = false }: { task: Task; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-3 text-sm shadow-sm cursor-grab",
        dragging && "shadow-lg ring-2 ring-primary",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1.5 size-2 rounded-full shrink-0",
            PRIORITY_DOT[task.priority],
          )}
          aria-hidden
        />
        <p className="leading-tight break-words">{task.title}</p>
      </div>
      {task.scheduledAt && (
        <div className="mt-1.5 text-xs text-muted-foreground">
          {format(task.scheduledAt, "EEE d MMM, HH:mm")}
        </div>
      )}
    </div>
  );
}
