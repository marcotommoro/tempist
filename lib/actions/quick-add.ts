"use server";

/**
 * Quick Add server action — resolve names→IDs poi crea il task.
 *
 * Policy:
 *  - Project per nome → REQUIRE existence (typing #foo non crea progetti per evitare typo)
 *  - Client per nome  → REQUIRE existence (idem)
 *  - Label per nome   → AUTO-CREATE se mancante (pattern Todoist-like)
 *
 * Match case-insensitive su tutti i nomi (ilike).
 */

import { revalidatePath } from "next/cache";
import { and, eq, ilike, or } from "drizzle-orm";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { db, schema } from "@/lib/db";
import { createTask } from "@/lib/domain/tasks";
import { parseQuickAdd } from "@/lib/parsers/quick-add";
import {
  defaultTaskScheduledAt,
  userTimezone,
} from "@/lib/utils/default-task-scheduled-at";
import type { ActionResult } from "./tasks";

const VIEW_PATHS = ["/today", "/inbox", "/upcoming"];

export async function createTaskFromQuickAddAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const input = String(formData.get("input") ?? "").trim();
    if (!input) return { ok: false, error: "Input vuoto" };

    const parsed = parseQuickAdd(input, {
      now: new Date(),
      timezone: userTimezone(user),
    });
    if (!parsed.title) {
      return { ok: false, error: "Il titolo non puo' essere vuoto dopo i token" };
    }

    const descriptionMarkdown =
      String(formData.get("descriptionMarkdown") ?? "").trim() || null;
    // Selezione esplicita dalle tendine: ha la precedenza sul token nel titolo.
    const explicitProjectId = String(formData.get("projectId") ?? "").trim();
    const explicitClientId = String(formData.get("clientId") ?? "").trim();

    // ---- Resolve project: tendina (esplicito) > token #nome (require existence) ----
    let projectId: string | null = null;
    if (explicitProjectId) {
      const proj = await db.query.project.findFirst({
        where: and(
          eq(schema.project.id, explicitProjectId),
          eq(schema.project.organizationId, organizationId),
        ),
      });
      if (!proj) {
        return { ok: false, error: "Progetto selezionato non valido" };
      }
      projectId = proj.id;
    } else if (parsed.projectName) {
      const proj = await db.query.project.findFirst({
        where: and(
          eq(schema.project.organizationId, organizationId),
          ilike(schema.project.name, parsed.projectName),
        ),
      });
      if (!proj) {
        return {
          ok: false,
          error: `Project "${parsed.projectName}" non esiste. Crealo prima dalla sidebar.`,
        };
      }
      projectId = proj.id;
    }

    // ---- Resolve client: tendina (esplicito) > token !cliente:nome (require existence) ----
    let clientId: string | null = null;
    if (explicitClientId) {
      const cl = await db.query.client.findFirst({
        where: and(
          eq(schema.client.id, explicitClientId),
          eq(schema.client.organizationId, organizationId),
        ),
      });
      if (!cl) {
        return { ok: false, error: "Cliente selezionato non valido" };
      }
      clientId = cl.id;
    } else if (parsed.clientName) {
      const cl = await db.query.client.findFirst({
        where: and(
          eq(schema.client.organizationId, organizationId),
          ilike(schema.client.name, parsed.clientName),
        ),
      });
      if (!cl) {
        return {
          ok: false,
          error: `Cliente "${parsed.clientName}" non esiste. Crealo prima da /clients.`,
        };
      }
      clientId = cl.id;
    }

    // ---- Resolve labels (auto-create missing) ----
    let labelIds: string[] = [];
    if (parsed.labelNames.length > 0) {
      const matchers = parsed.labelNames.map((n) => ilike(schema.label.name, n));
      const existing = await db.query.label.findMany({
        where: and(eq(schema.label.organizationId, organizationId), or(...matchers)),
      });
      const existingLower = new Map(existing.map((l) => [l.name.toLowerCase(), l]));
      // Mantiene l'ordine richiesto dall'utente
      for (const name of parsed.labelNames) {
        const found = existingLower.get(name.toLowerCase());
        if (found) {
          labelIds.push(found.id);
        } else {
          const [created] = await db
            .insert(schema.label)
            .values({ organizationId, name })
            .returning();
          if (created) {
            labelIds.push(created.id);
            existingLower.set(name.toLowerCase(), created);
          }
        }
      }
      // Dedup (se l'utente ha scritto @urgent @urgent)
      labelIds = Array.from(new Set(labelIds));
    }

    // ---- Create task ----
    const scheduledAt =
      parsed.scheduledAt ?? defaultTaskScheduledAt(userTimezone(user));

    const task = await createTask({
      organizationId,
      createdById: user.id,
      title: parsed.title,
      descriptionMarkdown,
      priority: parsed.priority,
      scheduledAt,
      estimatedMinutes: parsed.estimatedMinutes,
      projectId,
      clientId,
      recurrenceRule: parsed.recurrenceRule,
    });

    // ---- Link labels ----
    if (labelIds.length > 0) {
      await db
        .insert(schema.taskLabel)
        .values(labelIds.map((labelId) => ({ taskId: task.id, labelId })));
    }

    for (const p of VIEW_PATHS) revalidatePath(p);

    return { ok: true, data: { id: task.id } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore creazione task",
    };
  }
}
