import { describe, it, expect } from "vitest";

import {
  computeReportRange,
  fillDailyGaps,
} from "@/lib/utils/report-range";

describe("computeReportRange", () => {
  it("returns week range Mon-Sun with label", () => {
    const now = new Date("2026-05-20T12:00:00Z"); // mercoledì
    const { from, to } = computeReportRange("week", "UTC", now);
    expect(from.toISOString()).toBe("2026-05-18T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-05-24T23:59:59.999Z");
  });

  it("returns month range", () => {
    const now = new Date("2026-05-20T12:00:00Z");
    const { from, to } = computeReportRange("month", "UTC", now);
    expect(from.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-05-31T23:59:59.999Z");
  });

  it("returns last-week range (previous Mon-Sun)", () => {
    const now = new Date("2026-05-20T12:00:00Z"); // mercoledì 20
    const { from, to } = computeReportRange("last-week", "UTC", now);
    expect(from.toISOString()).toBe("2026-05-11T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-05-17T23:59:59.999Z");
  });

  it("respects Europe/Rome tz for week (CEST UTC+2)", () => {
    const now = new Date("2026-05-20T22:00:00Z"); // mercoledì 21 maggio 00:00 a Roma
    const { from } = computeReportRange("week", "Europe/Rome", now);
    // Lunedì 18 maggio 00:00 a Roma (CEST UTC+2) = domenica 17 maggio 22:00 UTC
    expect(from.toISOString()).toBe("2026-05-17T22:00:00.000Z");
  });
});

describe("fillDailyGaps", () => {
  it("fills missing days between from and to", () => {
    const data = [
      { day: "2026-05-19", value: 10 },
      { day: "2026-05-21", value: 30 },
    ];
    const result = fillDailyGaps(
      data,
      new Date("2026-05-18T00:00:00Z"),
      new Date("2026-05-22T00:00:00Z"),
      (day) => ({ day, value: 0 }),
    );
    expect(result.map((r) => r.day)).toEqual([
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
    ]);
    expect(result.find((r) => r.day === "2026-05-19")?.value).toBe(10);
    expect(result.find((r) => r.day === "2026-05-21")?.value).toBe(30);
    expect(result.find((r) => r.day === "2026-05-20")?.value).toBe(0);
  });

  it("returns single day when from == to", () => {
    const result = fillDailyGaps(
      [],
      new Date("2026-05-18T00:00:00Z"),
      new Date("2026-05-18T00:00:00Z"),
      (day) => ({ day, value: 0 }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.day).toBe("2026-05-18");
  });
});
