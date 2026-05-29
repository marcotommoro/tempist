"use server";

import { revalidatePath } from "next/cache";

import { and, eq, isNull } from "drizzle-orm";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { db, schema } from "@/lib/db";
import {
  createManualEntry,
  deleteTimeEntry,
  discardRunningTimer,
  reassignRunningTimer,
  startTimer,
  startTimerFromClient,
  startTimerFromProject,
  startTimerFromTask,
  stopTimer,
  updateTimeEntry,
  upsertQuickEntry,
} from "@/lib/domain/time-entries";
import type { TimeEntry } from "@/lib/db/schema";
import { validateTimeEntryRange } from "@/lib/utils/compute-duration-seconds";
import type { ActionResult } from "./tasks";

/** Info minima sul timer in corso, serializzata per il client (conflitto quick-start). */
export type RunningTimerInfo = {
  id: string;
  description: string | null;
  startedAt: string;
};

/**
 * Esito di un avvio rapido. A differenza di ActionResult ha un terzo stato
 * `conflict` per il caso "timer già in corso", che il client risolve mostrando
 * il dialog a tre vie (scarta / salva e avvia / unisci).
 */
export type StartTimerOutcome =
  | { ok: true; data: { id: string } }
  | { ok: false; conflict: true; existing: RunningTimerInfo }
  | { ok: false; conflict: false; error: string };

function runningInfo(e: TimeEntry | null): RunningTimerInfo | null {
  if (!e) return null;
  return {
    id: e.id,
    description: e.description,
    startedAt: e.startedAt.toISOString(),
  };
}

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

export async function startTimerFromProjectAction(
  projectId: string,
): Promise<StartTimerOutcome> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const project = await db.query.project.findFirst({
      where: and(
        eq(schema.project.id, projectId),
        eq(schema.project.organizationId, organizationId),
        isNull(schema.project.deletedAt),
      ),
    });
    if (!project) {
      return { ok: false, conflict: false, error: "Progetto non trovato" };
    }
    const res = await startTimerFromProject({
      organizationId,
      userId: user.id,
      project,
    });
    if (!res.ok) {
      const info = runningInfo(res.existing);
      if (!info) return { ok: false, conflict: false, error: "Hai già un timer attivo" };
      return { ok: false, conflict: true, existing: info };
    }
    revalidateAll();
    return { ok: true, data: { id: res.entry.id } };
  } catch (err) {
    return {
      ok: false,
      conflict: false,
      error: err instanceof Error ? err.message : "Errore",
    };
  }
}

export async function startTimerFromClientAction(
  clientId: string,
): Promise<StartTimerOutcome> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const client = await db.query.client.findFirst({
      where: and(
        eq(schema.client.id, clientId),
        eq(schema.client.organizationId, organizationId),
        isNull(schema.client.deletedAt),
      ),
    });
    if (!client) {
      return { ok: false, conflict: false, error: "Cliente non trovato" };
    }
    const res = await startTimerFromClient({
      organizationId,
      userId: user.id,
      client,
    });
    if (!res.ok) {
      const info = runningInfo(res.existing);
      if (!info) return { ok: false, conflict: false, error: "Hai già un timer attivo" };
      return { ok: false, conflict: true, existing: info };
    }
    revalidateAll();
    return { ok: true, data: { id: res.entry.id } };
  } catch (err) {
    return {
      ok: false,
      conflict: false,
      error: err instanceof Error ? err.message : "Errore",
    };
  }
}

/**
 * Risolve il conflitto "timer già in corso" e avvia il nuovo timer sul target.
 *   - discard → scarta il timer in corso, poi avvia il nuovo
 *   - save    → ferma/salva il timer in corso, poi avvia il nuovo
 *   - merge   → riassegna il timer in corso al target (override SOLO di
 *               cliente/progetto/task, descrizione e tempo invariati)
 */
export async function resolveTimerConflictAction(input: {
  resolution: "discard" | "save" | "merge";
  target: { kind: "project" | "client" | "task"; id: string };
}): Promise<ActionResult<{ id: string | null }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const { kind, id } = input.target;

    let ctx: {
      clientId: string | null;
      projectId: string | null;
      taskId: string | null;
      description: string;
    };
    if (kind === "project") {
      const project = await db.query.project.findFirst({
        where: and(
          eq(schema.project.id, id),
          eq(schema.project.organizationId, organizationId),
          isNull(schema.project.deletedAt),
        ),
      });
      if (!project) return { ok: false, error: "Progetto non trovato" };
      ctx = {
        clientId: project.clientId,
        projectId: project.id,
        taskId: null,
        description: project.name,
      };
    } else if (kind === "client") {
      const client = await db.query.client.findFirst({
        where: and(
          eq(schema.client.id, id),
          eq(schema.client.organizationId, organizationId),
          isNull(schema.client.deletedAt),
        ),
      });
      if (!client) return { ok: false, error: "Cliente non trovato" };
      ctx = {
        clientId: client.id,
        projectId: null,
        taskId: null,
        description: client.name,
      };
    } else {
      const task = await db.query.task.findFirst({
        where: and(
          eq(schema.task.id, id),
          eq(schema.task.organizationId, organizationId),
          isNull(schema.task.deletedAt),
        ),
      });
      if (!task) return { ok: false, error: "Task non trovato" };
      ctx = {
        clientId: task.clientId,
        projectId: task.projectId,
        taskId: task.id,
        description: task.title,
      };
    }

    if (input.resolution === "merge") {
      // Override solo del contesto: descrizione omessa → resta quella corrente.
      const updated = await reassignRunningTimer({
        userId: user.id,
        organizationId,
        clientId: ctx.clientId,
        projectId: ctx.projectId,
        taskId: ctx.taskId,
      });
      revalidateAll();
      return { ok: true, data: { id: updated?.id ?? null } };
    }

    if (input.resolution === "discard") {
      await discardRunningTimer({ userId: user.id, organizationId });
    } else {
      await stopTimer({ userId: user.id, organizationId });
    }
    const started = await startTimer({
      organizationId,
      userId: user.id,
      description: ctx.description,
      clientId: ctx.clientId,
      projectId: ctx.projectId,
      taskId: ctx.taskId,
    });
    if (!started.ok) {
      return { ok: false, error: "Impossibile avviare il nuovo timer" };
    }
    revalidateAll();
    return { ok: true, data: { id: started.entry.id } };
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

export async function upsertQuickEntryAction(input: {
  clientId: string;
  projectId: string | null;
  dayKey: string;
  hours: number;
}): Promise<ActionResult<{ id: string | null; durationSeconds: number }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    if (!input.clientId) {
      return { ok: false, error: "Cliente mancante" };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dayKey)) {
      return { ok: false, error: "Giorno non valido" };
    }
    if (!Number.isFinite(input.hours) || input.hours < 0 || input.hours > 24) {
      return { ok: false, error: "Ore non valide (0–24)" };
    }
    const result = await upsertQuickEntry({
      organizationId,
      userId: user.id,
      clientId: input.clientId,
      projectId: input.projectId,
      dayKey: input.dayKey,
      hours: input.hours,
    });
    revalidateAll();
    return {
      ok: true,
      data: {
        id: result?.id ?? null,
        durationSeconds: result?.durationSeconds ?? 0,
      },
    };
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
