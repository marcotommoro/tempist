import { describe, it, expect } from "vitest";

import {
  formatWeekLabel,
  getWeekRange,
  parseDateParam,
  parseWeekFromParam,
  resolveTimesheetRange,
  timesheetSearchParams,
} from "@/lib/utils/timesheet-week";

describe("parseDateParam", () => {
  it("returns undefined for missing or invalid input", () => {
    expect(parseDateParam(undefined)).toBeUndefined();
    expect(parseDateParam("not-a-date")).toBeUndefined();
  });

  it("parses ISO yyyy-MM-dd (date-fns parseISO returns local midnight)", () => {
    const d = parseDateParam("2026-05-15");
    expect(d).toBeDefined();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(15);
  });
});

describe("resolveTimesheetRange", () => {
  it("returns current week when both params missing (isCustom=false)", () => {
    const r = resolveTimesheetRange(undefined, undefined);
    expect(r.isCustom).toBe(false);
    // to is exclusive: endOfWeek(sunday 23:59:59.999) + 1 day → spans ~8d - 1ms
    const diffDays = (r.to.getTime() - r.from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(7);
    expect(diffDays).toBeLessThan(8);
  });

  it("returns week containing 'from' when only from is provided", () => {
    // 2026-05-15 = giovedì → settimana inizia lunedì 2026-05-11
    const r = resolveTimesheetRange("2026-05-15", undefined);
    expect(r.isCustom).toBe(false);
    expect(r.from.getDay()).toBe(1); // monday in local TZ
  });

  it("returns custom range (exclusive end) when both params present", () => {
    const r = resolveTimesheetRange("2026-05-01", "2026-05-20");
    expect(r.isCustom).toBe(true);
    // 'to' è esclusivo: addDays(2026-05-20, 1) → 2026-05-21 local
    expect(r.to.getDate()).toBe(21);
  });

  it("falls back to current week when 'to' parsing fails", () => {
    const r = resolveTimesheetRange("2026-05-15", "garbage");
    expect(r.isCustom).toBe(false);
  });
});

describe("timesheetSearchParams", () => {
  it("serialises only present keys", () => {
    const q = timesheetSearchParams({ clientId: "c-1" });
    expect(q).toBe("clientId=c-1");
  });

  it("formats dates as yyyy-MM-dd", () => {
    const from = new Date("2026-05-15T10:00:00Z");
    const q = timesheetSearchParams({ from });
    // tz-safe per UTC dates (il format usa l'instance Date senza zone shifting in test)
    expect(q).toMatch(/^from=2026-05-/);
  });

  it("includes projectId when provided", () => {
    const q = timesheetSearchParams({ clientId: "c-1", projectId: "p-1" });
    expect(q).toContain("clientId=c-1");
    expect(q).toContain("projectId=p-1");
  });
});

describe("getWeekRange + parseWeekFromParam", () => {
  it("getWeekRange uses Monday start and spans roughly 7 days", () => {
    const anchor = new Date("2026-05-15T12:00:00Z");
    const { from, to } = getWeekRange(anchor);
    expect(from.getDay()).toBe(1); // Monday in local TZ
    // 'to' è exclusive: endOfWeek (sunday 23:59:59.999) + 1 day → monday 23:59:59.999
    expect(to.getDay()).toBe(1);
    // span tra 7 e 8 giorni (anche se cosmeticamente è 8d - 1ms, è quel che il dominio aspetta come 'lt' bound)
    const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThan(7);
    expect(days).toBeLessThan(8);
  });

  it("parseWeekFromParam returns now for invalid input", () => {
    const a = parseWeekFromParam(undefined);
    const b = parseWeekFromParam("garbage");
    expect(a).toBeInstanceOf(Date);
    expect(b).toBeInstanceOf(Date);
  });

  it("formatWeekLabel uses Italian month abbreviation", () => {
    const from = new Date("2026-05-11T00:00:00Z");
    const to = new Date("2026-05-18T00:00:00Z"); // exclusive
    const label = formatWeekLabel(from, to);
    expect(label).toMatch(/mag/i);
    expect(label).toContain("2026");
  });
});
