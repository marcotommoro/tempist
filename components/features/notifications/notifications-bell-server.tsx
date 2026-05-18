import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  countUnread,
  listNotifications,
} from "@/lib/domain/notifications";
import { NotificationsBell } from "./notifications-bell";

export async function NotificationsBellServer() {
  const { user, organizationId } = await requireActiveOrganization();
  const [notifications, unreadCount] = await Promise.all([
    listNotifications({ userId: user.id, organizationId, limit: 20 }),
    countUnread({ userId: user.id, organizationId }),
  ]);
  return (
    <NotificationsBell
      notifications={notifications}
      unreadCount={unreadCount}
    />
  );
}
