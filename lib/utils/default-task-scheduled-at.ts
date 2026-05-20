import { addDays, set } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function defaultTaskScheduledAt(
  timezone: string,
  now: Date = new Date(),
): Date {
  const local = toZonedTime(now, timezone);
  const tomorrowLocal = addDays(local, 1);
  const atNine = set(tomorrowLocal, {
    hours: 9,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
  return fromZonedTime(atNine, timezone);
}

export function userTimezone(user: { timezone?: string | null }): string {
  return user.timezone ?? "Europe/Rome";
}
