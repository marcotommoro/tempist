"use client";

import { useCallback, useRef, useState } from "react";

import {
  durationMinutesFromRange,
  minutesToTimeString,
  syncTimeRangeAfterEdit,
  timeStringToMinutes,
  type TimeRangeAnchor,
} from "@/lib/utils/linked-time-range";
import {
  formatDurationMinutes,
  parseDurationToMinutes,
} from "@/lib/utils/parse-duration";

function buildCurrent(
  startTime: string,
  endTime: string,
  durationText: string,
): { startMinutes: number; endMinutes: number; durationMinutes: number } {
  const startMinutes = timeStringToMinutes(startTime) ?? 0;
  const endMinutes = timeStringToMinutes(endTime) ?? 0;
  const parsedDuration = parseDurationToMinutes(durationText);
  const durationMinutes =
    parsedDuration ?? durationMinutesFromRange(startMinutes, endMinutes);
  return { startMinutes, endMinutes, durationMinutes };
}

function initialDurationText(start: string, end: string): string {
  const s = timeStringToMinutes(start);
  const e = timeStringToMinutes(end);
  if (s == null || e == null) return "1h";
  const d = durationMinutesFromRange(s, e);
  return formatDurationMinutes(d > 0 ? d : 60);
}

export function useLinkedTimeRange(initialStart: string, initialEnd: string) {
  const anchorRef = useRef<TimeRangeAnchor | null>(null);
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [durationText, setDurationText] = useState(() =>
    initialDurationText(initialStart, initialEnd),
  );

  const applySync = useCallback(
    (result: ReturnType<typeof syncTimeRangeAfterEdit>) => {
      setStartTime(minutesToTimeString(result.startMinutes));
      setEndTime(minutesToTimeString(result.endMinutes));
      setDurationText(formatDurationMinutes(Math.max(0, result.durationMinutes)));
      anchorRef.current = result.anchor;
    },
    [],
  );

  const onStartChange = useCallback(
    (value: string) => {
      const newStart = timeStringToMinutes(value);
      if (newStart == null) {
        setStartTime(value);
        return;
      }
      const current = buildCurrent(startTime, endTime, durationText);
      applySync(
        syncTimeRangeAfterEdit("start", anchorRef.current, current, {
          startMinutes: newStart,
        }),
      );
    },
    [startTime, endTime, durationText, applySync],
  );

  const onEndChange = useCallback(
    (value: string) => {
      const newEnd = timeStringToMinutes(value);
      if (newEnd == null) {
        setEndTime(value);
        return;
      }
      const current = buildCurrent(startTime, endTime, durationText);
      applySync(
        syncTimeRangeAfterEdit("end", anchorRef.current, current, {
          endMinutes: newEnd,
        }),
      );
    },
    [startTime, endTime, durationText, applySync],
  );

  const onDurationChange = useCallback(
    (value: string) => {
      const newDuration = parseDurationToMinutes(value);
      if (newDuration == null) {
        setDurationText(value);
        return;
      }
      const current = buildCurrent(startTime, endTime, durationText);
      applySync(
        syncTimeRangeAfterEdit("duration", anchorRef.current, current, {
          durationMinutes: newDuration,
        }),
      );
    },
    [startTime, endTime, durationText, applySync],
  );

  const reset = useCallback((start: string, end: string) => {
    anchorRef.current = null;
    setStartTime(start);
    setEndTime(end);
    setDurationText(initialDurationText(start, end));
  }, []);

  const getResolvedRange = useCallback(() => {
    const startMinutes = timeStringToMinutes(startTime);
    const endMinutes = timeStringToMinutes(endTime);
    const durationMinutes = parseDurationToMinutes(durationText);
    if (startMinutes == null || endMinutes == null) {
      return { ok: false as const, error: "Orari non validi" };
    }
    if (durationMinutes == null) {
      return { ok: false as const, error: "Durata non valida (es. 1h, 1h30m, 90)" };
    }
    if (durationMinutes <= 0) {
      return { ok: false as const, error: "La durata deve essere maggiore di zero" };
    }
    if (endMinutes <= startMinutes) {
      return { ok: false as const, error: "Ora fine deve essere dopo ora inizio" };
    }
    return {
      ok: true as const,
      startMinutes,
      endMinutes,
      durationMinutes,
    };
  }, [startTime, endTime, durationText]);

  return {
    startTime,
    endTime,
    durationText,
    onStartChange,
    onEndChange,
    onDurationChange,
    reset,
    getResolvedRange,
  };
}
