import type { CalendarEventLink, Task } from "@/lib/db/schema";
import type { GoogleEvent } from "@/lib/integrations/google-calendar";
import { parseGoogleUpdatedAt } from "@/lib/integrations/google-calendar";

export type SyncWinner = "pull" | "push" | "skip";

const RACE_WARN_MS = 2_000;

export function resolveSyncWinner(opts: {
  task: Task;
  link: CalendarEventLink;
  googleUpdated: Date;
}): SyncWinner {
  const lastSync = opts.link.lastSyncedAt;
  const taskChanged = opts.task.updatedAt > lastSync;
  const lastGoogle = opts.link.googleUpdatedAt ?? lastSync;
  const googleChanged = opts.googleUpdated > lastGoogle;

  if (!taskChanged && !googleChanged) return "skip";
  if (!taskChanged && googleChanged) return "pull";
  if (taskChanged && !googleChanged) return "push";

  const taskMs = opts.task.updatedAt.getTime();
  const googleMs = opts.googleUpdated.getTime();
  if (Math.abs(taskMs - googleMs) < RACE_WARN_MS) {
    console.warn(
      `[calendar.sync] race task=${opts.task.id} delta=${Math.abs(taskMs - googleMs)}ms`,
    );
  }
  return googleMs >= taskMs ? "pull" : "push";
}

export function googleUpdatedForEvent(event: GoogleEvent): Date {
  return parseGoogleUpdatedAt(event);
}
