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

import { TaskCommentsSection } from "./task-comments-section";
import { TaskDescriptionEditor } from "./task-description-editor";
import { TaskPrioritySelect } from "./task-priority-select";

export function TaskDetailDialog({
  task,
  projectName,
  projectColor,
  currentUserId,
  open,
  onOpenChange,
}: {
  task: Task;
  projectName: string | null;
  projectColor: string | null;
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
      <DialogContent className="max-w-3xl p-0 gap-0 sm:rounded-xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="grid md:grid-cols-[1fr_240px]">
          {/* Sinistra: contenuto principale */}
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isDone}
                onChange={toggle}
                disabled={pending}
                aria-label="Completa task"
                className="mt-1.5 size-4 cursor-pointer accent-primary"
              />
              <div className="flex-1 min-w-0">
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
                    className="w-full text-lg font-semibold rounded-md border border-input bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTitleDraft(title);
                      setEditingTitle(true);
                    }}
                    className={cn(
                      "text-lg font-semibold text-left rounded-md hover:bg-muted/50 px-2 py-1 -mx-2 break-words w-full",
                      isDone && "line-through text-muted-foreground",
                    )}
                  >
                    {title}
                  </button>
                )}
                {error && (
                  <p className="text-xs text-destructive mt-1">{error}</p>
                )}
              </div>
            </div>

            <TaskDescriptionEditor
              taskId={task.id}
              initialDescription={task.descriptionMarkdown}
            />

            <hr className="border-border" />

            {open && comments === null ? (
              <p className="text-xs text-muted-foreground">Caricamento commenti...</p>
            ) : (
              <TaskCommentsSection
                taskId={task.id}
                initialComments={comments ?? []}
                currentUserId={currentUserId}
              />
            )}
          </div>

          {/* Destra: sidebar metadata */}
          <aside className="border-t md:border-t-0 md:border-l border-border bg-muted/30 p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            <Field label="Progetto">
              {projectName ? (
                <div className="inline-flex items-center gap-2 text-sm">
                  <span
                    aria-hidden
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: projectColor ?? "#808080" }}
                  />
                  {projectName}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">In arrivo</span>
              )}
            </Field>

            <Field label="Data">
              <DateTimePicker
                value={scheduledAt}
                onChange={onScheduledChange}
                disabled={pending}
                placeholder="Imposta data e ora"
              />
            </Field>

            <Field label="Scadenza">
              <DatePicker
                value={dueDate}
                onChange={onDueDateChange}
                disabled={pending}
                placeholder="Imposta scadenza"
              />
              {scheduledAt && dueDate && (
                <p className="text-[10px] text-muted-foreground">
                  Data: {format(scheduledAt, "d MMM HH:mm")} · Scadenza:{" "}
                  {format(dueDate, "d MMM")}
                </p>
              )}
            </Field>

            <Field label="Priorità">
              <TaskPrioritySelect taskId={task.id} currentPriority={task.priority} />
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
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
