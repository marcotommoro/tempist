"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/db/schema";
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications";

export function NotificationsBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function markOne(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id);
    });
  }

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  }

  function del(id: string) {
    startTransition(async () => {
      await deleteNotificationAction(id);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifiche"
          className="relative inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 inline-flex items-center justify-center rounded-full bg-red-500 text-[0.625em] font-semibold text-white tabular-nums"
              aria-label={`${unreadCount} non lette`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-semibold">Notifiche</div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAll}
              disabled={pending}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
            >
              <CheckCheck className="size-3" /> Segna tutte
            </button>
          )}
        </div>
        <ul className="max-h-96 overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nessuna notifica.
            </li>
          ) : (
            notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "group flex items-start gap-2 px-3 py-2",
                  !n.readAt && "bg-blue-50/40 dark:bg-blue-950/20",
                )}
              >
                <div className="flex-1 min-w-0">
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => {
                        if (!n.readAt) markOne(n.id);
                        setOpen(false);
                      }}
                      className="block hover:underline"
                    >
                      <NotificationBody notification={n} />
                    </Link>
                  ) : (
                    <NotificationBody notification={n} />
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.readAt && (
                    <button
                      type="button"
                      onClick={() => markOne(n.id)}
                      disabled={pending}
                      aria-label="Segna come letta"
                      title="Segna come letta"
                      className="p-1 text-muted-foreground hover:text-green-600 disabled:cursor-not-allowed"
                    >
                      <Check className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => del(n.id)}
                    disabled={pending}
                    aria-label="Elimina"
                    title="Elimina"
                    className="p-1 text-muted-foreground hover:text-destructive disabled:cursor-not-allowed"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function NotificationBody({ notification }: { notification: Notification }) {
  return (
    <>
      <div className="text-sm font-medium leading-tight break-words">
        {notification.title}
      </div>
      {notification.body && (
        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2 break-words">
          {notification.body}
        </div>
      )}
      <div className="mt-1 text-[0.625em] uppercase tracking-wider text-muted-foreground">
        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
      </div>
    </>
  );
}
