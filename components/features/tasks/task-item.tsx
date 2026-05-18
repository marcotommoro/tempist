"use client";

import { useTransition, useState } from "react";
import { Play, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { deleteTaskAction, toggleTaskAction } from "@/lib/actions/tasks";
import {
  createManualEntryAction,
  startTimerFromTaskAction,
} from "@/lib/actions/timer";
import type { Task } from "@/lib/db/schema";
import { TaskProgress } from "./task-progress";
import {
  CompleteWithDurationDialog,
  type CompleteDecision,
} from "./complete-with-duration-dialog";
import { TaskReminderButton } from "./task-reminder-button";

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  P1: "text-red-500",
  P2: "text-orange-500",
  P3: "text-blue-500",
  P4: "text-muted-foreground",
};

export function TaskItem({
  task,
  trackedSeconds = 0,
  reminderCount = 0,
}: {
  task: Task;
  trackedSeconds?: number;
  reminderCount?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  return (
    <li
      className={cn(
        "group flex items-start gap-3 px-3 py-2.5",
        pending && "opacity-50",
      )}
    >
      <input
        type="checkbox"
        checked={isDone}
        disabled={pending}
        onChange={onCheckboxChange}
        aria-label={isDone ? "Segna come da fare" : "Segna come completato"}
        className="mt-1 size-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-tight break-words",
            isDone && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className={cn("font-medium", PRIORITY_COLOR[task.priority])}>{task.priority}</span>
          {task.scheduledAt && (
            <span>{format(task.scheduledAt, "d MMM HH:mm")}</span>
          )}
          {task.dueDate && <span>due {format(task.dueDate, "d MMM")}</span>}
          {task.recurrenceRule && (
            <span title={task.recurrenceRule}>🔁</span>
          )}
          <TaskProgress
            trackedSeconds={trackedSeconds}
            estimatedMinutes={task.estimatedMinutes}
          />
          {error && <span className="text-red-500">{error}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
            className="text-muted-foreground hover:text-green-600 disabled:cursor-not-allowed"
          >
            <Play className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={del}
          disabled={pending}
          aria-label="Cancella task"
          className="disabled:cursor-not-allowed text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
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
    </li>
  );
}
