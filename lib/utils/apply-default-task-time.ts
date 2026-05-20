import { set } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function applyDefaultTaskTime(
  date: Date,
  timezone: string,
  hour = 9,
): Date {
  const local = toZonedTime(date, timezone);
  const atDefault = set(local, {
    hours: hour,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
  return fromZonedTime(atDefault, timezone);
}
