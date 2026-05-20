"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  setTaskDueDateAction,
  setTaskScheduledAtAction,
  setTaskTitleAction,
  toggleTaskAction,
} from "@/lib/actions/tasks";
import { fetchTaskCommentsAction } from "@/lib/actions/comments";
import type { CommentWithAuthor } from "@/lib/domain/comments";
import type { Task } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";

import { TaskCommentsSection } from "./task-comments-section";
import { TaskDescriptionEditor } from "./task-description-editor";
import { TaskPrioritySelect } from "./task-priority-select";
import { TaskEstimateField } from "./task-estimate-field";

export function TaskDetailDialog({
  task,
  projectName,
  projectColor,
  trackedSeconds = 0,
  currentUserId,
  open,
  onOpenChange,
}: {
  task: Task;
  projectName: string | null;
  projectColor: string | null;
  trackedSeconds?: number;
  currentUserId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const isDone = !!task.completedAt;
  const [title, setTitle] = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(task.scheduledAt);
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<CommentWithAuthor[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchTaskCommentsAction(task.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setComments(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, task.id]);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleTaskAction(task.id);
      if (!res.ok) setError(res.error);
    });
  }

  function saveTitle() {
    const next = titleDraft.trim();
    if (!next || next === title) {
      setEditingTitle(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await setTaskTitleAction(task.id, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle(next);
      setEditingTitle(false);
    });
  }

  function onScheduledChange(d: Date | null) {
    setScheduledAt(d);
    setError(null);
    startTransition(async () => {
      const res = await setTaskScheduledAtAction(task.id, d ? d.toISOString() : null);
      if (!res.ok) setError(res.error);
    });
  }

  function onDueDateChange(d: Date | null) {
    setDueDate(d);
    setError(null);
    startTransition(async () => {
      // dueDate è date-only: portiamo al mezzogiorno UTC del giorno per evitare drift tz
      const iso = d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)).toISOString() : null;
      const res = await setTaskDueDateAction(task.id, iso);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="grid md:grid-cols-[1fr_260px]">
          {/* Sinistra: contenuto principale */}
          <div className="max-h-[80vh] space-y-5 overflow-y-auto p-6">
            <div className="flex items-start gap-3">
              <label className="relative mt-1.5 inline-flex shrink-0 cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={toggle}
                  disabled={pending}
                  aria-label="Completa task"
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "grid h-[18px] w-[18px] place-items-center rounded-full border transition-all duration-[var(--dur-base)]",
                    isDone
                      ? "border-sage bg-sage"
                      : "border-muted-foreground/40 hover:border-coral hover:bg-coral/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
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
                {editingTitle ? (
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitle();
                      if (e.key === "Escape") {
                        setTitleDraft(title);
                        setEditingTitle(false);
                      }
                    }}
                    autoFocus
                    disabled={pending}
                    className="w-full rounded-md border border-input bg-background px-2 py-1 font-display text-2xl leading-tight tracking-tight focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTitleDraft(title);
                      setEditingTitle(true);
                    }}
                    className={cn(
                      "-mx-2 block w-full rounded-md break-words px-2 py-1 text-left font-display text-2xl leading-tight tracking-tight transition-colors hover:bg-accent/40",
                      isDone && "text-muted-foreground line-through",
                    )}
                  >
                    {title}
                  </button>
                )}
                {error && (
                  <p className="mt-1 text-xs text-destructive">{error}</p>
                )}
              </div>
            </div>

            <TaskDescriptionEditor
              taskId={task.id}
              initialDescription={task.descriptionMarkdown}
            />

            <hr className="border-border" />

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
                  Comments
                </h3>
                {comments && comments.length > 0 && (
                  <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
                    {String(comments.length).padStart(2, "0")}
                  </span>
                )}
              </div>
              {open && comments === null ? (
                <p className="font-display text-sm italic text-muted-foreground">
                  Caricamento commenti...
                </p>
              ) : (
                <TaskCommentsSection
                  taskId={task.id}
                  initialComments={comments ?? []}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          </div>

          {/* Destra: sidebar metadata */}
          <aside className="max-h-[80vh] space-y-5 overflow-y-auto border-t border-border bg-muted/40 p-5 md:border-l md:border-t-0">
            <Field label="Project">
              {projectName ? (
                <div className="inline-flex items-center gap-2 text-[0.8125em]">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ backgroundColor: projectColor ?? "#808080" }}
                  />
                  {projectName}
                </div>
              ) : (
                <span className="font-display text-sm italic text-muted-foreground">
                  In arrivo
                </span>
              )}
            </Field>

            <Field label="Date">
              <DateTimePicker
                value={scheduledAt}
                onChange={onScheduledChange}
                disabled={pending}
                placeholder="Imposta data e ora"
              />
            </Field>

            <Field label="Due">
              <DatePicker
                value={dueDate}
                onChange={onDueDateChange}
                disabled={pending}
                placeholder="Imposta scadenza"
              />
              {scheduledAt && dueDate && (
                <p className="font-mono text-[0.625em] uppercase tracking-[0.12em] text-muted-foreground">
                  {format(scheduledAt, "d LLL HH:mm")} →{" "}
                  {format(dueDate, "d LLL")}
                </p>
              )}
            </Field>

            <Field label="Priority">
              <TaskPrioritySelect taskId={task.id} currentPriority={task.priority} />
            </Field>

            <Field label="Time">
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-mono text-[0.5625em] uppercase tracking-[0.16em] text-muted-foreground">
                      tracked
                    </span>
                    <span className="font-mono text-base tabular-nums text-foreground">
                      {trackedSeconds > 0 ? formatDuration(trackedSeconds) : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-[0.5625em] uppercase tracking-[0.16em] text-muted-foreground">
                      estimate
                    </span>
                    <span className="font-mono text-base tabular-nums text-muted-foreground">
                      {task.estimatedMinutes != null
                        ? formatMinutes(task.estimatedMinutes)
                        : "—"}
                    </span>
                  </div>
                </div>
                <TaskEstimateField
                  taskId={task.id}
                  estimatedMinutes={task.estimatedMinutes}
                />
              </div>
            </Field>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function formatMinutes(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
