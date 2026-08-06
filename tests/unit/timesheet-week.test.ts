import { describe, it, expect } from "vitest";

import {
  formatMonthLabel,
  formatPeriodLabel,
  formatWeekLabel,
  getMonthRange,
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
  it("returns current month when both params missing (preset=month)", () => {
    const r = resolveTimesheetRange(undefined, undefined);
    expect(r.preset).toBe("month");
    const now = new Date();
    expect(r.from.getMonth()).toBe(now.getMonth());
    expect(r.from.getDate()).toBe(1);
    const diffDays = (r.to.getTime() - r.from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(28);
    expect(diffDays).toBeLessThan(32);
  });

  it("returns week containing 'from' when preset=week", () => {
    const r = resolveTimesheetRange("2026-05-15", undefined, "week");
    expect(r.preset).toBe("week");
    expect(r.from.getDay()).toBe(1);
  });

  it("returns custom range (exclusive end) when both params present", () => {
    const r = resolveTimesheetRange("2026-05-01", "2026-05-20");
    expect(r.preset).toBe("custom");
    expect(r.to.getDate()).toBe(21);
  });

  it("falls back to month when 'to' parsing fails", () => {
    const r = resolveTimesheetRange("2026-05-15", "garbage");
    expect(r.preset).toBe("month");
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
    expect(q).toMatch(/^from=2026-05-/);
  });

  it("includes projectId and preset when provided", () => {
    const q = timesheetSearchParams({ clientId: "c-1", projectId: "p-1", preset: "week" });
    expect(q).toContain("clientId=c-1");
    expect(q).toContain("projectId=p-1");
    expect(q).toContain("preset=week");
  });
});

describe("getWeekRange + getMonthRange + parseWeekFromParam", () => {
  it("getWeekRange uses Monday start and spans roughly 7 days", () => {
    const anchor = new Date("2026-05-15T12:00:00Z");
    const { from, to } = getWeekRange(anchor);
    expect(from.getDay()).toBe(1);
    expect(to.getDay()).toBe(1);
    const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThan(7);
    expect(days).toBeLessThan(8);
  });

  it("getMonthRange spans the full calendar month", () => {
    const anchor = new Date("2026-05-15T12:00:00Z");
    const { from, to } = getMonthRange(anchor);
    expect(from.getDate()).toBe(1);
    expect(from.getMonth()).toBe(4);
    const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThan(31);
    expect(days).toBeLessThan(32);
  });

  it("parseWeekFromParam returns now for invalid input", () => {
    const a = parseWeekFromParam(undefined);
    const b = parseWeekFromParam("garbage");
    expect(a).toBeInstanceOf(Date);
    expect(b).toBeInstanceOf(Date);
  });

  it("formatWeekLabel uses Italian month abbreviation", () => {
    const from = new Date("2026-05-11T00:00:00Z");
    const to = new Date("2026-05-18T00:00:00Z");
    const label = formatWeekLabel(from, to);
    expect(label).toMatch(/mag/i);
    expect(label).toContain("2026");
  });

  it("formatPeriodLabel uses month label for month preset", () => {
    const from = new Date("2026-05-01T00:00:00Z");
    const to = new Date("2026-06-01T00:00:00Z");
    const label = formatPeriodLabel(from, to, "month");
    expect(label).toMatch(/maggio/i);
    expect(label).toContain("2026");
  });

  it("formatMonthLabel uses Italian month name", () => {
    const from = new Date("2026-05-01T00:00:00Z");
    expect(formatMonthLabel(from)).toMatch(/maggio/i);
  });
});
