"use server";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { sendDigestNow } from "@/lib/domain/digest";
import type { ActionResult } from "./tasks";

export async function sendTestDigestAction(): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    await sendDigestNow({ user, organizationId });
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
