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
import { normalizeDescriptionHtml } from "@/lib/utils/html";
import { resolveTaskFromTitle } from "@/lib/parsers/resolve-task-from-title";
import {
  defaultTaskScheduledAt,
  userTimezone,
} from "@/lib/utils/default-task-scheduled-at";
import type { Task } from "@/lib/db/schema";
import {
  createSubtask,
  createTask,
  listSubtasks,
  rescheduleOverdueToToday,
  softDeleteTask,
  toggleTaskComplete,
  updateTaskClient,
  updateTaskDescription,
  updateTaskPriority,
  updateTaskProject,
  updateTaskSchedule,
  updateTaskTitle,
} from "@/lib/domain/tasks";
import { listProjects } from "@/lib/domain/projects";
import { listClients } from "@/lib/domain/clients";

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
  clientId: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .transform((v) => (v && v !== "null" ? v : null)),
  descriptionMarkdown: z
    .string()
    .trim()
    .max(20000)
    .nullable()
    .optional()
    .transform((v) => (v && v.length ? v : null)),
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
      clientId: formData.get("clientId") || undefined,
      descriptionMarkdown: formData.get("descriptionMarkdown") || undefined,
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

    if (!hasExplicitSchedule) {
      const resolved = resolveTaskFromTitle(parsed.data.title, {
        timezone,
        now: new Date(),
      });
      title = resolved.title;
      if (resolved.scheduledAt) scheduledAt = resolved.scheduledAt;
      if (priority === "P4") priority = resolved.priority;
    }

    scheduledAt = scheduledAt ?? defaultTaskScheduledAt(timezone);

    const task = await createTask({
      organizationId,
      createdById: user.id,
      title,
      descriptionMarkdown: normalizeDescriptionHtml(parsed.data.descriptionMarkdown),
      scheduledAt,
      priority,
      projectId: parsed.data.projectId ?? null,
      sectionId: parsed.data.sectionId ?? null,
      clientId: parsed.data.clientId ?? null,
    });
    revalidateTaskViews();
    if (parsed.data.projectId) {
      revalidatePath(`/projects/${parsed.data.projectId}`);
    }
    if (parsed.data.clientId) {
      revalidatePath(`/clients/${parsed.data.clientId}`);
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

export async function fetchSubtasksAction(
  parentId: string,
): Promise<ActionResult<Task[]>> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const subtasks = await listSubtasks({ parentId, organizationId });
    return { ok: true, data: subtasks };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Errore caricamento sottoattività",
    };
  }
}

const createSubtaskSchema = z.object({
  parentId: z.string().min(1),
  title: z.string().trim().min(1, "Titolo richiesto").max(500),
});

export async function createSubtaskAction(
  parentId: string,
  title: string,
): Promise<ActionResult<Task>> {
  try {
    const parsed = createSubtaskSchema.safeParse({ parentId, title });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }
    const { user, organizationId } = await requireActiveOrganization();
    // Titolo puro, niente NLP: una sottoattività non ha data/progetto propri.
    const created = await createSubtask({
      organizationId,
      createdById: user.id,
      parentId: parsed.data.parentId,
      title: parsed.data.title,
    });
    revalidateTaskViews();
    return { ok: true, data: created };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Errore creazione sottoattività",
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

// Stesso limite di createTaskSchema: vale sulla stringa HTML, non sul testo visibile.
const taskDescriptionSchema = z
  .string()
  .max(20000, "Descrizione troppo lunga (max 20k caratteri)")
  .nullable();

export async function setTaskDescriptionAction(
  taskId: string,
  descriptionMarkdown: string | null,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const parsed = taskDescriptionSchema.safeParse(descriptionMarkdown);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Input non valido" };
    }
    await updateTaskDescription({
      taskId,
      organizationId,
      descriptionMarkdown: normalizeDescriptionHtml(parsed.data),
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

export async function setTaskProjectAction(
  taskId: string,
  projectId: string | null,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    await updateTaskProject({ taskId, organizationId, projectId });
    revalidateTaskViews();
    if (projectId) revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento progetto",
    };
  }
}

export async function setTaskClientAction(
  taskId: string,
  clientId: string | null,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    await updateTaskClient({ taskId, organizationId, clientId });
    revalidateTaskViews();
    if (clientId) revalidatePath(`/clients/${clientId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento cliente",
    };
  }
}

export type TaskPickerOption = { id: string; name: string; color: string | null };

/**
 * Opzioni per le tendine progetto/cliente del task dialog. Caricate lazy
 * all'apertura del dialog (come i commenti) per non propagare le liste come
 * prop attraverso tutte le pagine che renderizzano la lista task.
 */
export async function fetchTaskPickerOptionsAction(): Promise<
  ActionResult<{ projects: TaskPickerOption[]; clients: TaskPickerOption[] }>
> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const [projects, clients] = await Promise.all([
      listProjects({ organizationId }),
      listClients({ organizationId }),
    ]);
    return {
      ok: true,
      data: {
        projects: projects.map((p) => ({ id: p.id, name: p.name, color: p.color })),
        clients: clients.map((c) => ({ id: c.id, name: c.name, color: c.color })),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore caricamento opzioni",
    };
  }
}
