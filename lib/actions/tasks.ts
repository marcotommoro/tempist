"use server";

/**
 * Server Actions per i task.
 *
 * Pattern uso lato client:
 *   <form action={createTaskAction}>
 *     <input name="title" />
 *     ...
 *   </form>
 *
 * Le action ritornano sempre un ActionResult discriminato (ok/error) — niente throw
 * verso il client (Next.js perderebbe lo stack server-side).
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { resolveTaskFromTitle } from "@/lib/parsers/resolve-task-from-title";
import {
  defaultTaskScheduledAt,
  userTimezone,
} from "@/lib/utils/default-task-scheduled-at";
import {
  createTask,
  rescheduleOverdueToToday,
  softDeleteTask,
  toggleTaskComplete,
  updateTaskDescription,
  updateTaskEstimatedMinutes,
  updateTaskPriority,
  updateTaskSchedule,
  updateTaskTitle,
} from "@/lib/domain/tasks";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const TASK_VIEW_PATHS = ["/today", "/inbox", "/upcoming"];

function revalidateTaskViews() {
  for (const p of TASK_VIEW_PATHS) revalidatePath(p);
  // Le project pages mostrano lo stesso task — revalida tutto sotto root layout
  // (Next ricompila solo le pages effettivamente rese).
  revalidatePath("/", "layout");
}

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Titolo richiesto").max(500),
  scheduledAt: z
    .union([z.string().min(1), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v)))
    .nullable()
    .optional(),
  priority: z.enum(["P1", "P2", "P3", "P4"]).default("P4"),
  projectId: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .transform((v) => (v && v !== "null" ? v : null)),
  sectionId: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .transform((v) => (v && v !== "null" ? v : null)),
});

export async function createTaskAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const raw = {
      title: formData.get("title"),
      scheduledAt: formData.get("scheduledAt") || undefined,
      priority: (formData.get("priority") as string | null) ?? "P4",
      projectId: formData.get("projectId") || undefined,
      sectionId: formData.get("sectionId") || undefined,
    };
    const parsed = createTaskSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }

    const timezone = userTimezone(user);
    const hasExplicitSchedule = formData.get("scheduledAt") != null;

    let title = parsed.data.title;
    let scheduledAt = parsed.data.scheduledAt ?? null;
    let priority = parsed.data.priority;
    let estimatedMinutes: number | null = null;

    if (!hasExplicitSchedule) {
      const resolved = resolveTaskFromTitle(parsed.data.title, {
        timezone,
        now: new Date(),
      });
      title = resolved.title;
      if (resolved.scheduledAt) scheduledAt = resolved.scheduledAt;
      if (priority === "P4") priority = resolved.priority;
      estimatedMinutes = resolved.estimatedMinutes;
    }

    scheduledAt = scheduledAt ?? defaultTaskScheduledAt(timezone);

    const task = await createTask({
      organizationId,
      createdById: user.id,
      title,
      scheduledAt,
      priority,
      estimatedMinutes,
      projectId: parsed.data.projectId ?? null,
      sectionId: parsed.data.sectionId ?? null,
    });
    revalidateTaskViews();
    if (parsed.data.projectId) {
      revalidatePath(`/projects/${parsed.data.projectId}`);
    }
    return { ok: true, data: { id: task.id } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore creazione task",
    };
  }
}

export async function toggleTaskAction(
  taskId: string,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    await toggleTaskComplete({ taskId, organizationId });
    revalidateTaskViews();
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore toggle task",
    };
  }
}

export async function setTaskScheduledAtAction(
  taskId: string,
  isoDateOrNull: string | null,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const scheduledAt = isoDateOrNull ? new Date(isoDateOrNull) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      return { ok: false, error: "Data non valida" };
    }
    await updateTaskSchedule({ taskId, organizationId, scheduledAt });
    revalidateTaskViews();
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento data",
    };
  }
}

export async function setTaskDueDateAction(
  taskId: string,
  isoDateOrNull: string | null,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const dueDate = isoDateOrNull ? new Date(isoDateOrNull) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return { ok: false, error: "Data non valida" };
    }
    await updateTaskSchedule({ taskId, organizationId, dueDate });
    revalidateTaskViews();
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento scadenza",
    };
  }
}

export async function rescheduleOverdueAction(): Promise<
  ActionResult<{ count: number }>
> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const timezone =
      (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";
    const count = await rescheduleOverdueToToday({ organizationId, timezone });
    revalidateTaskViews();
    return { ok: true, data: { count } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore riprogrammazione",
    };
  }
}

export async function deleteTaskAction(
  taskId: string,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    await softDeleteTask({ taskId, organizationId });
    revalidateTaskViews();
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore cancellazione task",
    };
  }
}

export async function setTaskDescriptionAction(
  taskId: string,
  descriptionMarkdown: string | null,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const normalized = descriptionMarkdown?.trim();
    await updateTaskDescription({
      taskId,
      organizationId,
      descriptionMarkdown: normalized ? normalized : null,
    });
    revalidateTaskViews();
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento descrizione",
    };
  }
}

export async function setTaskPriorityAction(
  taskId: string,
  priority: "P1" | "P2" | "P3" | "P4",
): Promise<ActionResult> {
  try {
    if (!["P1", "P2", "P3", "P4"].includes(priority)) {
      return { ok: false, error: "Priorità non valida" };
    }
    const { organizationId } = await requireActiveOrganization();
    await updateTaskPriority({ taskId, organizationId, priority });
    revalidateTaskViews();
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento priorità",
    };
  }
}

export async function setTaskTitleAction(
  taskId: string,
  title: string,
): Promise<ActionResult> {
  try {
    if (!title.trim()) return { ok: false, error: "Titolo richiesto" };
    const { organizationId } = await requireActiveOrganization();
    await updateTaskTitle({ taskId, organizationId, title });
    revalidateTaskViews();
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento titolo",
    };
  }
}

export async function setTaskEstimatedMinutesAction(
  taskId: string,
  estimatedMinutes: number | null,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    await updateTaskEstimatedMinutes({ taskId, organizationId, estimatedMinutes });
    revalidateTaskViews();
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento stima",
    };
  }
}
