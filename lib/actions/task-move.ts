"use server";

/**
 * Move task action: persiste la nuova posizione di un task dopo un drag-and-drop sul Board.
 *
 * Strategia: ricevi l'array completo `orderedTaskIds` della colonna destinazione,
 * e aggiorna in una transazione:
 *  - il task spostato → setta sectionId
 *  - tutti i task in `orderedTaskIds` → riassegna order = 0..N-1
 *
 * Cosi' il client e' source-of-truth sull'ordine, il server applica.
 */

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { db, schema } from "@/lib/db";
import type { ActionResult } from "./tasks";

const moveSchema = z.object({
  taskId: z.string().min(1),
  toSectionId: z.string().min(1).nullable(),
  orderedTaskIds: z.array(z.string().min(1)).min(1),
  projectId: z.string().min(1),
});

export async function moveTaskAction(input: {
  taskId: string;
  toSectionId: string | null;
  orderedTaskIds: string[];
  projectId: string;
}): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const parsed = moveSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }
    const { taskId, toSectionId, orderedTaskIds, projectId } = parsed.data;

    await db.transaction(async (tx) => {
      // 1) Sposta il task target nella nuova section
      await tx
        .update(schema.task)
        .set({ sectionId: toSectionId })
        .where(
          and(
            eq(schema.task.id, taskId),
            eq(schema.task.organizationId, organizationId),
          ),
        );

      // 2) Reassegna order 0..N-1 per i task della colonna destinazione
      for (let i = 0; i < orderedTaskIds.length; i++) {
        const id = orderedTaskIds[i]!;
        await tx
          .update(schema.task)
          .set({ order: i })
          .where(
            and(
              eq(schema.task.id, id),
              eq(schema.task.organizationId, organizationId),
            ),
          );
      }
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/today");
    revalidatePath("/inbox");
    revalidatePath("/upcoming");
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore spostamento task",
    };
  }
}
