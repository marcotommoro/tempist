"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  detectCsvSource,
  importTodoistTasks,
  importTogglTimeEntries,
  parseCsv,
} from "@/lib/domain/import";
import type { ActionResult } from "./tasks";

export type ImportResult = {
  source: "todoist" | "toggl" | "unknown";
  inserted: number;
  skipped: number;
  errors: { rowIndex: number; message: string }[];
};

export async function importCsvAction(formData: FormData): Promise<
  ActionResult<ImportResult>
> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "File mancante" };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { ok: false, error: "File troppo grande (max 5MB)" };
    }
    const csv = await file.text();
    const { headers } = parseCsv(csv);
    const source = detectCsvSource(headers);

    if (source === "todoist") {
      const r = await importTodoistTasks({
        organizationId,
        createdById: user.id,
        csv,
      });
      revalidatePath("/", "layout");
      return {
        ok: true,
        data: {
          source: "todoist",
          inserted: r.inserted,
          skipped: r.skipped,
          errors: r.errors,
        },
      };
    }
    if (source === "toggl") {
      const r = await importTogglTimeEntries({
        organizationId,
        userId: user.id,
        csv,
      });
      revalidatePath("/", "layout");
      return {
        ok: true,
        data: {
          source: "toggl",
          inserted: r.inserted,
          skipped: r.skipped,
          errors: r.errors,
        },
      };
    }
    return {
      ok: false,
      error:
        "Formato CSV non riconosciuto. Atteso: Todoist (TYPE,CONTENT,…) o Toggl (Start date,Duration,…)",
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
