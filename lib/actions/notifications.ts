"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  deleteNotification,
  markAllRead,
  markRead,
} from "@/lib/domain/notifications";
import type { ActionResult } from "./tasks";

function revalidateBell() {
  // Bell vive nel layout (app)
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    await markRead({ notificationId, userId: user.id, organizationId });
    revalidateBell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    await markAllRead({ userId: user.id, organizationId });
    revalidateBell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function deleteNotificationAction(
  notificationId: string,
): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    await deleteNotification({
      notificationId,
      userId: user.id,
      organizationId,
    });
    revalidateBell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
