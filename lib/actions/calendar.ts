"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  deleteAccount,
  setAccountPullEnabled,
} from "@/lib/domain/calendar-accounts";
import type { ActionResult } from "./tasks";

export async function disconnectCalendarAccountAction(
  accountId: string,
): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    await deleteAccount({ accountId, userId: user.id, organizationId });
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function setCalendarPullEnabledAction(
  accountId: string,
  enabled: boolean,
): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    await setAccountPullEnabled({
      accountId,
      userId: user.id,
      organizationId,
      enabled,
    });
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
