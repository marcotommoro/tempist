"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { db, schema } from "@/lib/db";
import {
  createReminder,
  deleteReminder,
  listRemindersForTask,
} from "@/lib/domain/reminders";
import { parseRelativeOffset } from "@/lib/utils/reminder-time";
import type { ActionResult } from "./tasks";

function revalidateAll() {
  revalidatePath("/", "layout");
}

const addReminderSchema = z
  .object({
    taskId: z.string().min(1),
    triggerType: z.enum(["TIME", "RELATIVE"]),
    triggerValue: z.string().min(1),
  })
  .superRefine((v, ctx) => {
    if (v.triggerType === "TIME") {
      const t = new Date(v.triggerValue);
      if (Number.isNaN(t.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["triggerValue"],
          message: "Data/ora non valida",
        });
      }
    } else if (parseRelativeOffset(v.triggerValue) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["triggerValue"],
        message: "Formato relativo non valido (es. -30m, -1h, -1d)",
      });
    }
  });

export async function addReminderAction(input: {
  taskId: string;
  triggerType: "TIME" | "RELATIVE";
  triggerValue: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const parsed = addReminderSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }
    // Verifica che il task appartenga alla org
    const task = await db.query.task.findFirst({
      where: and(
        eq(schema.task.id, parsed.data.taskId),
        eq(schema.task.organizationId, organizationId),
        isNull(schema.task.deletedAt),
      ),
    });
    if (!task) return { ok: false, error: "Task non trovato" };

    if (parsed.data.triggerType === "RELATIVE" && !task.scheduledAt) {
      return {
        ok: false,
        error: "I reminder relativi richiedono uno scheduledAt sul task",
      };
    }

    const reminder = await createReminder(parsed.data);
    revalidateAll();
    return { ok: true, data: { id: reminder.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function deleteReminderAction(input: {
  reminderId: string;
  taskId: string;
}): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    // Verifica ownership via JOIN task
    const reminder = await db.query.reminder.findFirst({
      where: eq(schema.reminder.id, input.reminderId),
    });
    if (!reminder) return { ok: false, error: "Reminder non trovato" };
    const task = await db.query.task.findFirst({
      where: and(
        eq(schema.task.id, reminder.taskId),
        eq(schema.task.organizationId, organizationId),
      ),
    });
    if (!task) return { ok: false, error: "Reminder non autorizzato" };

    await deleteReminder(input.reminderId);
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function listRemindersAction(taskId: string) {
  const { organizationId } = await requireActiveOrganization();
  const task = await db.query.task.findFirst({
    where: and(
      eq(schema.task.id, taskId),
      eq(schema.task.organizationId, organizationId),
    ),
  });
  if (!task) return [];
  return listRemindersForTask(taskId);
}
