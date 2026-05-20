import { describe, expect, it } from "vitest";

import {
  durationMinutesFromRange,
  minutesToTimeString,
  syncTimeRangeAfterEdit,
  timeStringToMinutes,
} from "@/lib/utils/linked-time-range";

describe("syncTimeRangeAfterEdit", () => {
  const base = { startMinutes: 9 * 60, endMinutes: 10 * 60, durationMinutes: 60 };

  it("modifica fine → ricalcola durata (ancora start)", () => {
    const r = syncTimeRangeAfterEdit("end", null, base, { endMinutes: 12 * 60 });
    expect(r.durationMinutes).toBe(180);
    expect(r.startMinutes).toBe(9 * 60);
    expect(r.endMinutes).toBe(12 * 60);
  });

  it("modifica inizio → ricalcola durata (ancora end)", () => {
    const r = syncTimeRangeAfterEdit("start", null, base, { startMinutes: 8 * 60 });
    expect(r.durationMinutes).toBe(120);
    expect(r.endMinutes).toBe(10 * 60);
  });

  it("modifica durata → ricalcola fine (ancora start)", () => {
    const r = syncTimeRangeAfterEdit("duration", null, base, { durationMinutes: 120 });
    expect(r.endMinutes).toBe(11 * 60);
    expect(r.startMinutes).toBe(9 * 60);
  });

  it("dopo durata, modifica inizio → sposta fine", () => {
    const afterDur = syncTimeRangeAfterEdit("duration", null, base, { durationMinutes: 120 });
    const r = syncTimeRangeAfterEdit(
      "start",
      afterDur.anchor,
      afterDur,
      { startMinutes: 8 * 60 },
    );
    expect(r.endMinutes).toBe(10 * 60);
    expect(r.durationMinutes).toBe(120);
  });

  it("dopo durata, modifica fine → sposta inizio", () => {
    const afterDur = syncTimeRangeAfterEdit("duration", null, base, { durationMinutes: 120 });
    const r = syncTimeRangeAfterEdit("end", afterDur.anchor, afterDur, { endMinutes: 13 * 60 });
    expect(r.startMinutes).toBe(11 * 60);
    expect(r.durationMinutes).toBe(120);
    expect(r.endMinutes).toBe(13 * 60);
  });

  it("dopo fine, modifica inizio → ricalcola durata", () => {
    const afterEnd = syncTimeRangeAfterEdit("end", null, base, { endMinutes: 12 * 60 });
    const r = syncTimeRangeAfterEdit(
      "start",
      afterEnd.anchor,
      afterEnd,
      { startMinutes: 8 * 60 },
    );
    expect(r.durationMinutes).toBe(240);
    expect(r.endMinutes).toBe(12 * 60);
  });
});

describe("time helpers", () => {
  it("converte HH:mm ↔ minuti", () => {
    expect(timeStringToMinutes("09:30")).toBe(570);
    expect(minutesToTimeString(570)).toBe("09:30");
    expect(durationMinutesFromRange(540, 600)).toBe(60);
  });
});
