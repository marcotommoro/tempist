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
  formatDurationSeconds,
  parseDurationToSeconds,
} from "@/lib/utils/parse-duration";

// Il sync start/end/durata resta al minuto (vedi linked-time-range.ts); qui la
// DURATA è la sorgente di verità ed è precisa al secondo. Gli orari HH:mm restano
// al minuto, ma l'istante di fine viene derivato da inizio + durata (vedi i dialog),
// così una voce sub-minuto (es. 5s) non viene mai "arrotondata a 1h".
function durationTextToMinutes(durationText: string): number | null {
  const sec = parseDurationToSeconds(durationText);
  return sec == null ? null : Math.round(sec / 60);
}

function buildCurrent(
  startTime: string,
  endTime: string,
  durationText: string,
): { startMinutes: number; endMinutes: number; durationMinutes: number } {
  const startMinutes = timeStringToMinutes(startTime) ?? 0;
  const endMinutes = timeStringToMinutes(endTime) ?? 0;
  const parsedDuration = durationTextToMinutes(durationText);
  const durationMinutes =
    parsedDuration ?? durationMinutesFromRange(startMinutes, endMinutes);
  return { startMinutes, endMinutes, durationMinutes };
}

/**
 * Testo iniziale del campo durata. Se `initialDurationSeconds` è fornito (es. una
 * voce esistente) usa il valore REALE — niente più fallback fittizio "1h". Altrimenti
 * lo calcola dal range degli orari (utile per le nuove voci manuali).
 */
function initialDurationText(
  start: string,
  end: string,
  initialDurationSeconds?: number,
): string {
  if (initialDurationSeconds != null) {
    return formatDurationSeconds(initialDurationSeconds);
  }
  const s = timeStringToMinutes(start);
  const e = timeStringToMinutes(end);
  if (s == null || e == null) return "0s";
  return formatDurationSeconds(Math.max(0, durationMinutesFromRange(s, e)) * 60);
}

export function useLinkedTimeRange(
  initialStart: string,
  initialEnd: string,
  initialDurationSeconds?: number,
) {
  const anchorRef = useRef<TimeRangeAnchor | null>(null);
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [durationText, setDurationText] = useState(() =>
    initialDurationText(initialStart, initialEnd, initialDurationSeconds),
  );

  const applySync = useCallback(
    (
      result: ReturnType<typeof syncTimeRangeAfterEdit>,
      opts?: { durationText?: string },
    ) => {
      setStartTime(minutesToTimeString(result.startMinutes));
      setEndTime(minutesToTimeString(result.endMinutes));
      setDurationText(
        opts?.durationText ??
          formatDurationSeconds(Math.max(0, result.durationMinutes) * 60),
      );
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
      const newDuration = durationTextToMinutes(value);
      if (newDuration == null) {
        setDurationText(value);
        return;
      }
      const current = buildCurrent(startTime, endTime, durationText);
      applySync(
        syncTimeRangeAfterEdit("duration", anchorRef.current, current, {
          durationMinutes: newDuration,
        }),
        { durationText: value },
      );
    },
    [startTime, endTime, durationText, applySync],
  );

  const onDurationBlur = useCallback(() => {
    const parsed = parseDurationToSeconds(durationText);
    if (parsed != null) {
      setDurationText(formatDurationSeconds(parsed));
    }
  }, [durationText]);

  const reset = useCallback(
    (start: string, end: string, durationSeconds?: number) => {
      anchorRef.current = null;
      setStartTime(start);
      setEndTime(end);
      setDurationText(initialDurationText(start, end, durationSeconds));
    },
    [],
  );

  const getResolvedRange = useCallback(() => {
    const startMinutes = timeStringToMinutes(startTime);
    const endMinutes = timeStringToMinutes(endTime);
    const durationSeconds = parseDurationToSeconds(durationText);
    if (startMinutes == null || endMinutes == null) {
      return { ok: false as const, error: "Orari non validi" };
    }
    if (durationSeconds == null) {
      return {
        ok: false as const,
        error: "Durata non valida (es. 2, 1h30m, 1:30, 30s)",
      };
    }
    if (durationSeconds <= 0) {
      return { ok: false as const, error: "La durata deve essere maggiore di zero" };
    }
    return {
      ok: true as const,
      startMinutes,
      endMinutes,
      durationMinutes: Math.round(durationSeconds / 60),
      durationSeconds,
    };
  }, [startTime, endTime, durationText]);

  return {
    startTime,
    endTime,
    durationText,
    onStartChange,
    onEndChange,
    onDurationChange,
    onDurationBlur,
    reset,
    getResolvedRange,
  };
}
