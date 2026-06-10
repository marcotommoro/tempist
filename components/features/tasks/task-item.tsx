"use client";

import { useState, useTransition } from "react";
import { ListChecks, MessageSquare, Play, Repeat, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { deleteTaskAction, toggleTaskAction } from "@/lib/actions/tasks";
import {
  createManualEntryAction,
  startTimerFromTaskAction,
} from "@/lib/actions/timer";
import type { Task } from "@/lib/db/schema";
import type { SubtaskCounts } from "@/lib/domain/tasks";
import { TaskProgress } from "./task-progress";
import {
  CompleteWithDurationDialog,
  type CompleteDecision,
} from "./complete-with-duration-dialog";
import { TaskReminderButton } from "./task-reminder-button";
import { TaskSchedulePicker } from "./task-schedule-picker";
import { TaskDetailDialog } from "./task-detail-dialog";

const PRIORITY_DOT: Record<Task["priority"], string> = {
  P1: "bg-p1",
  P2: "bg-p2",
  P3: "bg-p3",
  P4: "bg-transparent",
};
const PRIORITY_LABEL: Record<Task["priority"], string> = {
  P1: "Priority 1",
  P2: "Priority 2",
  P3: "Priority 3",
  P4: "No priority",
};

export function TaskItem({
  task,
  trackedSeconds = 0,
  reminderCount = 0,
  commentCount = 0,
  subtaskCounts = null,
  projectName = null,
  projectColor = null,
  clientName = null,
  clientColor = null,
  currentUserId,
  liRef,
  liStyle,
  liProps,
}: {
  task: Task;
  trackedSeconds?: number;
  reminderCount?: number;
  commentCount?: number;
  /** Conteggio sottoattività {total, completed} per il badge "2/5". */
  subtaskCounts?: SubtaskCounts | null;
  projectName?: string | null;
  projectColor?: string | null;
  clientName?: string | null;
  clientColor?: string | null;
  currentUserId?: string;
  /** Hook per drag&drop (dnd-kit): ref/style/listeners applicati al <li>. */
  liRef?: React.Ref<HTMLLIElement>;
  liStyle?: React.CSSProperties;
  liProps?: Record<string, unknown>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const isDone = !!task.completedAt;

  const shouldPromptDuration =
    !isDone &&
    !!task.estimatedMinutes &&
    task.estimatedMinutes > 0 &&
    trackedSeconds === 0;

  function runToggle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleTaskAction(task.id);
      if (!res.ok) setError(res.error);
    });
  }

  function onCheckboxChange() {
    if (shouldPromptDuration) {
      setDialogOpen(true);
      return;
    }
    runToggle();
  }

  function onDurationDecision(d: CompleteDecision) {
    setError(null);
    startTransition(async () => {
      if (d.type === "confirm") {
        const endedAt = new Date();
        const startedAt = new Date(endedAt.getTime() - d.minutes * 60_000);
        const entry = await createManualEntryAction({
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          description: task.title,
          taskId: task.id,
          projectId: task.projectId,
          clientId: task.clientId,
        });
        if (!entry.ok) {
          setError(entry.error);
          return;
        }
      }
      const res = await toggleTaskAction(task.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDialogOpen(false);
    });
  }

  function del() {
    setError(null);
    startTransition(async () => {
      const res = await deleteTaskAction(task.id);
      if (!res.ok) setError(res.error);
    });
  }

  function startTimer() {
    setError(null);
    startTransition(async () => {
      const res = await startTimerFromTaskAction(task.id);
      if (!res.ok) setError(res.error);
    });
  }

  // Computed once at mount: due dates change slowly, a page refresh handles stale state.
  // Using useState's lazy initializer is React's sanctioned escape for impure mount-time reads.
  const [overdueAtMount] = useState(() =>
    task.dueDate ? new Date(task.dueDate).getTime() < Date.now() : false,
  );
  const isOverdue = !isDone && overdueAtMount;

  return (
    <li
      ref={liRef}
      style={liStyle}
      {...(liProps as React.LiHTMLAttributes<HTMLLIElement>)}
      className={cn(
        "group relative flex items-start gap-3 px-3 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-accent/40",
        pending && "opacity-50",
      )}
    >
      {/* Custom circular checkbox */}
      <label className="relative mt-[3px] inline-flex shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={isDone}
          disabled={pending}
          onChange={onCheckboxChange}
          aria-label={isDone ? "Segna come da fare" : "Segna come completato"}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "relative grid h-[16px] w-[16px] place-items-center rounded-full border transition-all duration-[var(--dur-base)]",
            isDone
              ? "border-sage bg-sage"
              : "border-muted-foreground/40 bg-transparent group-hover:border-coral group-hover:bg-coral/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
          )}
        >
          {isDone && (
            <svg
              viewBox="0 0 16 16"
              className="h-3 w-3 text-sage-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="animate-check" d="M3.5 8.5L7 12l5.5-7" />
            </svg>
          )}
        </span>
      </label>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {task.priority !== "P4" && (
            <span
              aria-label={PRIORITY_LABEL[task.priority]}
              title={PRIORITY_LABEL[task.priority]}
              className={cn(
                "mt-[5px] inline-block h-1.5 w-1.5 shrink-0 rounded-full self-center",
                PRIORITY_DOT[task.priority],
              )}
            />
          )}
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className={cn(
              "block w-full break-words text-left text-[0.875em] leading-snug transition-colors cursor-pointer hover:text-coral",
              isDone && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6875em] tabular-nums text-muted-foreground">
          {clientName && (
            <span
              className="inline-flex max-w-44 items-center gap-1 truncate rounded-full border px-2 py-px font-mono text-[0.875em] font-semibold normal-case leading-snug"
              style={{
                color: clientColor ?? undefined,
                borderColor: clientColor ? `${clientColor}66` : undefined,
                backgroundColor: clientColor ? `${clientColor}1a` : undefined,
              }}
              title={`Cliente: ${clientName}`}
            >
              {clientName}
            </span>
          )}
          {projectName && (
            <span className="inline-flex items-center gap-1.5 normal-case">
              {projectColor && (
                <span
                  className="h-1.5 w-1.5 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: projectColor }}
                  aria-hidden
                />
              )}
              <span className="text-foreground/80">{projectName}</span>
            </span>
          )}
          {task.scheduledAt && (
            <span>{format(task.scheduledAt, "d LLL · HH:mm")}</span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 normal-case",
                isOverdue
                  ? "text-destructive underline decoration-dotted underline-offset-4"
                  : "text-amber-600 dark:text-amber-400",
              )}
            >
              <span className="font-mono text-[0.5625em] uppercase tracking-[0.16em]">due</span>{" "}
              {format(task.dueDate, "d LLL")}
            </span>
          )}
          {task.recurrenceRule && (
            <span title={task.recurrenceRule} className="inline-flex items-center gap-1">
              <Repeat className="size-3" />
            </span>
          )}
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3" /> {commentCount}
            </span>
          )}
          {subtaskCounts && subtaskCounts.total > 0 && (
            <span
              className="inline-flex items-center gap-1"
              title={`Sottoattività: ${subtaskCounts.completed}/${subtaskCounts.total}`}
            >
              <ListChecks className="size-3" /> {subtaskCounts.completed}/
              {subtaskCounts.total}
            </span>
          )}
          <TaskProgress
            trackedSeconds={trackedSeconds}
            estimatedMinutes={task.estimatedMinutes}
          />
          {error && <span className="text-destructive normal-case">{error}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100 focus-within:opacity-100">
        {!isDone && (
          <TaskSchedulePicker
            taskId={task.id}
            currentScheduledAt={task.scheduledAt}
          />
        )}
        {!isDone && (
          <TaskReminderButton
            taskId={task.id}
            hasScheduledAt={!!task.scheduledAt}
            reminderCount={reminderCount}
          />
        )}
        {!isDone && (
          <button
            type="button"
            onClick={startTimer}
            disabled={pending}
            aria-label="Avvia timer su questo task"
            title="Start timer"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sage/15 hover:text-sage disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <Play className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={del}
          disabled={pending}
          aria-label="Cancella task"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {shouldPromptDuration && task.estimatedMinutes != null && (
        <CompleteWithDurationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          taskTitle={task.title}
          defaultMinutes={task.estimatedMinutes}
          pending={pending}
          onDecision={onDurationDecision}
        />
      )}
      {currentUserId && (
        <TaskDetailDialog
          task={task}
          projectName={projectName}
          projectColor={projectColor}
          trackedSeconds={trackedSeconds}
          currentUserId={currentUserId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </li>
  );
}
