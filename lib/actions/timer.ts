"use server";

import { revalidatePath } from "next/cache";

import { and, eq, isNull } from "drizzle-orm";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { db, schema } from "@/lib/db";
import {
  createManualEntry,
  deleteTimeEntry,
  startTimer,
  startTimerFromTask,
  stopTimer,
  updateTimeEntry,
} from "@/lib/domain/time-entries";
import { validateTimeEntryRange } from "@/lib/utils/compute-duration-seconds";
import type { ActionResult } from "./tasks";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export type StartTimerInput = {
  description?: string;
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
};

export async function startTimerAction(
  input: StartTimerInput = {},
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const res = await startTimer({
      organizationId,
      userId: user.id,
      description: input.description ?? null,
      clientId: input.clientId ?? null,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: res.existing
          ? `Hai già un timer attivo: "${res.existing.description ?? "(senza descrizione)"}"`
          : "Hai già un timer attivo",
      };
    }
    revalidateAll();
    return { ok: true, data: { id: res.entry.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function stopTimerAction(): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const stopped = await stopTimer({ userId: user.id, organizationId });
    if (!stopped) {
      return { ok: false, error: "Nessun timer attivo" };
    }
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function startTimerFromTaskAction(
  taskId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const task = await db.query.task.findFirst({
      where: and(
        eq(schema.task.id, taskId),
        eq(schema.task.organizationId, organizationId),
        isNull(schema.task.deletedAt),
      ),
    });
    if (!task) return { ok: false, error: "Task non trovato" };
    const res = await startTimerFromTask({ organizationId, userId: user.id, task });
    if (!res.ok) {
      return {
        ok: false,
        error: res.existing
          ? `Hai già un timer attivo: "${res.existing.description ?? "(senza descrizione)"}"`
          : "Hai già un timer attivo",
      };
    }
    revalidateAll();
    return { ok: true, data: { id: res.entry.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function deleteTimeEntryAction(
  timeEntryId: string,
): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    await deleteTimeEntry({
      timeEntryId,
      organizationId,
      actorId: user.id,
    });
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function updateTimeEntryAction(input: {
  timeEntryId: string;
  startedAt: string;
  endedAt: string;
  description?: string;
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  isBillable?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const startedAt = new Date(input.startedAt);
    const endedAt = new Date(input.endedAt);
    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      return { ok: false, error: "Date non valide" };
    }
    try {
      validateTimeEntryRange(startedAt, endedAt);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Intervallo non valido",
      };
    }
    const entry = await updateTimeEntry({
      timeEntryId: input.timeEntryId,
      organizationId,
      actorId: user.id,
      startedAt,
      endedAt,
      description: input.description ?? null,
      clientId: input.clientId ?? null,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      isBillable: input.isBillable,
    });
    revalidateAll();
    return { ok: true, data: { id: entry.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function createManualEntryAction(input: {
  startedAt: string;
  endedAt: string;
  description?: string;
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  isBillable?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const startedAt = new Date(input.startedAt);
    const endedAt = new Date(input.endedAt);
    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      return { ok: false, error: "Date non valide" };
    }
    const entry = await createManualEntry({
      organizationId,
      userId: user.id,
      startedAt,
      endedAt,
      description: input.description ?? null,
      clientId: input.clientId ?? null,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      isBillable: input.isBillable,
    });
    revalidateAll();
    return { ok: true, data: { id: entry.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
