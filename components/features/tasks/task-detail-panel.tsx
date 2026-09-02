"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { Hash, User } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  fetchSubtasksAction,
  fetchTaskPickerOptionsAction,
  setTaskClientAction,
  setTaskDueDateAction,
  setTaskProjectAction,
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
import { TaskSubtasksSection } from "./task-subtasks-section";
import { TaskPrioritySelect } from "./task-priority-select";
import { TaskTimeEntries } from "./task-time-entries";
import { Picker, type PickItem } from "./quick-add-panel";

export function TaskDetailPanel({
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
  const [projectId, setProjectId] = useState<string | null>(task.projectId);
  const [clientId, setClientId] = useState<string | null>(task.clientId);
  const [pending, startTransition] = useTransition();
  const [trackedTotal, setTrackedTotal] = useState(trackedSeconds);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<CommentWithAuthor[] | null>(null);
  const [subtasks, setSubtasks] = useState<Task[] | null>(null);
  const [options, setOptions] = useState<{
    projects: PickItem[];
    clients: PickItem[];
  } | null>(null);

  // Le sottoattività hanno un solo livello: nel pannello di una sottoattività
  // la sezione non esiste proprio.
  const isSubtask = task.parentId != null;

  useEffect(() => {
    setTrackedTotal(trackedSeconds);
  }, [trackedSeconds, task.id]);

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

  useEffect(() => {
    if (!open || isSubtask) return;
    let cancelled = false;
    fetchSubtasksAction(task.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setSubtasks(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, task.id, isSubtask]);

  useEffect(() => {
    if (!open || options) return;
    let cancelled = false;
    fetchTaskPickerOptionsAction().then((res) => {
      if (cancelled) return;
      if (res.ok) setOptions(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, options]);

  // Finché le opzioni non sono caricate, mostra almeno il progetto corrente
  // (nome/colore già noti via prop) così la tendina non "lampeggia" vuota.
  const projectItems =
    options?.projects ??
    (task.projectId && projectName
      ? [{ id: task.projectId, name: projectName, color: projectColor }]
      : []);
  const clientItems = options?.clients ?? [];

  function onProjectChange(id: string | null) {
    setProjectId(id);
    setError(null);
    startTransition(async () => {
      const res = await setTaskProjectAction(task.id, id);
      if (!res.ok) setError(res.error);
    });
  }

  function onClientChange(id: string | null) {
    setClientId(id);
    setError(null);
    startTransition(async () => {
      const res = await setTaskClientAction(task.id, id);
      if (!res.ok) setError(res.error);
    });
  }

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleTaskAction(task.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Completare il padre completa anche le sottoattività (cascata
      // server-side): ricarica la lista per riflettere lo stato.
      if (!isDone && !isSubtask) {
        const refreshed = await fetchSubtasksAction(task.id);
        if (refreshed.ok) setSubtasks(refreshed.data);
      }
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-content-scope
        className="w-full gap-0 p-0 sm:max-w-[900px]"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {/* Su mobile scorre tutto il pannello; da md le due colonne scorrono
            in modo indipendente, così i metadati restano sempre a vista. */}
        <div className="flex h-full min-h-0 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          {/* Sinistra: contenuto principale. pr-12 lascia spazio alla X finché
              non passa sopra la colonna dei metadati. */}
          <div className="min-w-0 flex-1 space-y-5 p-6 pr-12 md:overflow-y-auto md:pr-6">
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

            {!isSubtask && (
              <>
                <hr className="border-border" />

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
                      Sottoattività
                    </h3>
                    {subtasks && subtasks.length > 0 && (
                      <span className="font-mono text-[0.625em] tabular-nums text-muted-foreground">
                        {subtasks.filter((s) => s.completedAt).length}/
                        {subtasks.length}
                      </span>
                    )}
                  </div>
                  {open && subtasks === null ? (
                    <p className="font-serif text-sm italic text-muted-foreground">
                      Caricamento sottoattività...
                    </p>
                  ) : (
                    <TaskSubtasksSection
                      parentTaskId={task.id}
                      subtasks={subtasks ?? []}
                      onSubtasksChange={setSubtasks}
                    />
                  )}
                </div>
              </>
            )}

            <hr className="border-border" />

            <TaskTimeEntries
              taskId={task.id}
              projectId={task.projectId}
              clientId={task.clientId}
              open={open}
              onTotalChange={setTrackedTotal}
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
                <p className="font-serif text-sm italic text-muted-foreground">
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
          <aside className="space-y-5 border-t border-border bg-muted/40 p-5 md:w-[300px] md:shrink-0 md:overflow-y-auto md:border-l md:border-t-0 md:pt-12">
            <Field label="Project">
              <Picker
                items={projectItems}
                selectedId={projectId}
                onSelect={onProjectChange}
                icon={<Hash className="size-3" />}
                placeholder="Progetto"
                tokenName={null}
                searchPlaceholder="Cerca progetto…"
                emptyText="Nessun progetto"
                disabled={pending || !options}
              />
            </Field>

            <Field label="Client">
              <Picker
                items={clientItems}
                selectedId={clientId}
                onSelect={onClientChange}
                icon={<User className="size-3" />}
                placeholder="Cliente"
                tokenName={null}
                searchPlaceholder="Cerca cliente…"
                emptyText="Nessun cliente"
                disabled={pending || !options}
              />
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
              <div className="flex flex-col">
                <span className="font-mono text-[0.5625em] uppercase tracking-[0.16em] text-muted-foreground">
                  tracked
                </span>
                <span className="font-mono text-base tabular-nums text-foreground">
                  {trackedTotal > 0 ? formatDuration(trackedTotal) : "—"}
                </span>
              </div>
            </Field>
          </aside>
        </div>
      </SheetContent>
    </Sheet>
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
