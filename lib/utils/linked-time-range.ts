export type TimeRangeAnchor = "start" | "end" | "duration";

export function timeStringToMinutes(time: string): number | null {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return h * 60 + min;
}

export function minutesToTimeString(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.floor(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function durationMinutesFromRange(startMinutes: number, endMinutes: number): number {
  return endMinutes - startMinutes;
}

export function syncTimeRangeAfterEdit(
  edited: TimeRangeAnchor,
  prevAnchor: TimeRangeAnchor | null,
  current: {
    startMinutes: number;
    endMinutes: number;
    durationMinutes: number;
  },
  update: {
    startMinutes?: number;
    endMinutes?: number;
    durationMinutes?: number;
  },
): {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  anchor: TimeRangeAnchor;
} {
  let start = current.startMinutes;
  let end = current.endMinutes;
  let duration = current.durationMinutes;

  if (edited === "start" && update.startMinutes != null) {
    start = update.startMinutes;
    if (prevAnchor === "duration") {
      end = start + duration;
    } else {
      duration = end - start;
    }
  } else if (edited === "end" && update.endMinutes != null) {
    end = update.endMinutes;
    if (prevAnchor === "duration") {
      start = end - duration;
    } else {
      duration = end - start;
    }
  } else if (edited === "duration" && update.durationMinutes != null) {
    duration = update.durationMinutes;
    end = start + duration;
  }

  return { startMinutes: start, endMinutes: end, durationMinutes: duration, anchor: edited };
}
