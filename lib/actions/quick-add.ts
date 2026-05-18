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
import type { ActionResult } from "./tasks";

const VIEW_PATHS = ["/today", "/inbox", "/upcoming"];

export async function createTaskFromQuickAddAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const input = String(formData.get("input") ?? "").trim();
    if (!input) return { ok: false, error: "Input vuoto" };

    const parsed = parseQuickAdd(input);
    if (!parsed.title) {
      return { ok: false, error: "Il titolo non puo' essere vuoto dopo i token" };
    }

    // ---- Resolve project (require existence) ----
    let projectId: string | null = null;
    if (parsed.projectName) {
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

    // ---- Resolve client (require existence) ----
    let clientId: string | null = null;
    if (parsed.clientName) {
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
    const task = await createTask({
      organizationId,
      createdById: user.id,
      title: parsed.title,
      priority: parsed.priority,
      scheduledAt: parsed.scheduledAt,
      estimatedMinutes: parsed.estimatedMinutes,
      projectId,
      clientId,
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
