"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { createIcalToken, revokeIcalToken } from "@/lib/domain/ical";
import type { ActionResult } from "./tasks";

export async function createIcalTokenAction(): Promise<
  ActionResult<{ id: string; token: string }>
> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const t = await createIcalToken({ userId: user.id, organizationId });
    revalidatePath("/settings");
    return { ok: true, data: { id: t.id, token: t.token } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function revokeIcalTokenAction(
  tokenId: string,
): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    await revokeIcalToken({ tokenId, userId: user.id, organizationId });
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
