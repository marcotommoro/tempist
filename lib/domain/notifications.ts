/**
 * Notifications domain — in-app notification queue.
 *
 * Le notifiche sono per-user e per-org (un user può essere in più org → la stessa
 * persona vede notifiche diverse a seconda dell'active org corrente).
 *
 * Tipo (stringa convenzionale, non enum perché evolve con le feature):
 *   - "task.due_soon"      → "Task X scade tra 30min"
 *   - "task.overdue"       → "Task X è overdue"
 *   - "task.assigned"      → "Y ti ha assegnato un task"  (Fase futura, multi-user)
 *   - "reminder.fired"     → "Promemoria: task X"
 *   - "calendar.synced"    → "Sync calendario completato"
 *   - "comment.mentioned"  → "@menzione in commento"      (Fase futura)
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Notification } from "@/lib/db/schema";

export type NotificationType =
  | "task.due_soon"
  | "task.overdue"
  | "task.assigned"
  | "reminder.fired"
  | "calendar.synced"
  | "comment.mentioned"
  | "system";

export async function listNotifications(opts: {
  userId: string;
  organizationId: string;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<Notification[]> {
  const conds = [
    eq(schema.notification.userId, opts.userId),
    eq(schema.notification.organizationId, opts.organizationId),
  ];
  if (opts.unreadOnly) conds.push(isNull(schema.notification.readAt));
  return db.query.notification.findMany({
    where: and(...conds),
    orderBy: [desc(schema.notification.createdAt)],
    limit: opts.limit ?? 20,
  });
}

export async function countUnread(opts: {
  userId: string;
  organizationId: string;
}): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.notification)
    .where(
      and(
        eq(schema.notification.userId, opts.userId),
        eq(schema.notification.organizationId, opts.organizationId),
        isNull(schema.notification.readAt),
      ),
    );
  return Number(row?.count ?? 0);
}

export type CreateNotificationInput = {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  const [created] = await db
    .insert(schema.notification)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    })
    .returning();
  if (!created) throw new Error("Insert notification fallito");
  return created;
}

export async function markRead(opts: {
  notificationId: string;
  userId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .update(schema.notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notification.id, opts.notificationId),
        eq(schema.notification.userId, opts.userId),
        eq(schema.notification.organizationId, opts.organizationId),
        isNull(schema.notification.readAt),
      ),
    );
}

export async function markAllRead(opts: {
  userId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .update(schema.notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notification.userId, opts.userId),
        eq(schema.notification.organizationId, opts.organizationId),
        isNull(schema.notification.readAt),
      ),
    );
}

export async function deleteNotification(opts: {
  notificationId: string;
  userId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .delete(schema.notification)
    .where(
      and(
        eq(schema.notification.id, opts.notificationId),
        eq(schema.notification.userId, opts.userId),
        eq(schema.notification.organizationId, opts.organizationId),
      ),
    );
}
