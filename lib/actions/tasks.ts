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
import {
  createTask,
  softDeleteTask,
  toggleTaskComplete,
} from "@/lib/domain/tasks";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const TASK_VIEW_PATHS = ["/today", "/inbox", "/upcoming"];

function revalidateTaskViews() {
  for (const p of TASK_VIEW_PATHS) revalidatePath(p);
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
    };
    const parsed = createTaskSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }
    const task = await createTask({
      organizationId,
      createdById: user.id,
      title: parsed.data.title,
      scheduledAt: parsed.data.scheduledAt ?? null,
      priority: parsed.data.priority,
      projectId: parsed.data.projectId ?? null,
    });
    revalidateTaskViews();
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
