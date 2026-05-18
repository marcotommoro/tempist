"use server";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { sendWeeklyReportNow } from "@/lib/domain/weekly-report";
import type { ActionResult } from "./tasks";

export async function sendTestWeeklyReportAction(): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const tz =
      (user as unknown as { timezone?: string }).timezone ?? "Europe/Rome";
    await sendWeeklyReportNow({
      userEmail: user.email,
      organizationId,
      tz,
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
