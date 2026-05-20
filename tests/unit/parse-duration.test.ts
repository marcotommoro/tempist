import { describe, expect, it } from "vitest";

import {
  formatDurationMinutes,
  parseDurationToMinutes,
} from "@/lib/utils/parse-duration";

describe("parseDurationToMinutes", () => {
  it("numero senza unità → ore", () => {
    expect(parseDurationToMinutes("2")).toBe(120);
    expect(parseDurationToMinutes("1")).toBe(60);
  });

  it("mantiene suffissi espliciti", () => {
    expect(parseDurationToMinutes("30m")).toBe(30);
    expect(parseDurationToMinutes("1h")).toBe(60);
    expect(parseDurationToMinutes("1h30m")).toBe(90);
    expect(parseDurationToMinutes("1:30")).toBe(90);
  });
});

describe("formatDurationMinutes", () => {
  it("formatta ore intere con h", () => {
    expect(formatDurationMinutes(120)).toBe("2h");
    expect(formatDurationMinutes(90)).toBe("1h30m");
  });
});
