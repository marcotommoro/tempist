"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  createSavedFilter,
  deleteSavedFilter,
} from "@/lib/domain/saved-filters";
import type { ActionResult } from "./tasks";

const createFilterSchema = z.object({
  name: z.string().trim().min(1, "Nome richiesto").max(80),
  queryDsl: z.string().trim().min(1, "Query richiesta").max(500),
});

function revalidateFilters(filterId?: string) {
  revalidatePath("/filters");
  if (filterId) revalidatePath(`/filters/${filterId}`);
  revalidatePath("/", "layout");
}

export async function createFilterAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const parsed = createFilterSchema.safeParse({
      name: formData.get("name"),
      queryDsl: formData.get("queryDsl"),
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }
    const filter = await createSavedFilter({
      organizationId,
      userId: user.id,
      name: parsed.data.name,
      queryDsl: parsed.data.queryDsl,
    });
    revalidateFilters(filter.id);
    return { ok: true, data: { id: filter.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function deleteFilterAction(
  filterId: string,
): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    await deleteSavedFilter({ filterId, organizationId, userId: user.id });
    revalidateFilters();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
