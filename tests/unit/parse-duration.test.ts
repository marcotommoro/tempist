import { describe, expect, it } from "vitest";

import {
  formatDurationMinutes,
  formatDurationSeconds,
  parseDurationToMinutes,
  parseDurationToSeconds,
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

describe("parseDurationToSeconds", () => {
  it("numero secco → ore", () => {
    expect(parseDurationToSeconds("2")).toBe(7200);
    expect(parseDurationToSeconds("1")).toBe(3600);
  });

  it("suffissi e combinazioni", () => {
    expect(parseDurationToSeconds("30m")).toBe(1800);
    expect(parseDurationToSeconds("1h")).toBe(3600);
    expect(parseDurationToSeconds("1h30m")).toBe(5400);
    expect(parseDurationToSeconds("1h30m5s")).toBe(5405);
    expect(parseDurationToSeconds("30s")).toBe(30);
    expect(parseDurationToSeconds("5s")).toBe(5);
  });

  it("shorthand e formati con i due punti", () => {
    expect(parseDurationToSeconds("1h30")).toBe(5400);
    expect(parseDurationToSeconds("1:30")).toBe(5400);
    expect(parseDurationToSeconds("1:30:05")).toBe(5405);
  });

  it("scarta input non validi o <= 0", () => {
    expect(parseDurationToSeconds("")).toBeNull();
    expect(parseDurationToSeconds("0s")).toBeNull();
    expect(parseDurationToSeconds("1:99")).toBeNull();
    expect(parseDurationToSeconds("abc")).toBeNull();
  });
});

describe("formatDurationSeconds", () => {
  it("mostra i secondi solo quando servono", () => {
    expect(formatDurationSeconds(5)).toBe("5s");
    expect(formatDurationSeconds(90)).toBe("1m30s");
    expect(formatDurationSeconds(3600)).toBe("1h");
    expect(formatDurationSeconds(5400)).toBe("1h30m");
    expect(formatDurationSeconds(5405)).toBe("1h30m5s");
    expect(formatDurationSeconds(0)).toBe("0s");
  });

  it("ed è inverso di parseDurationToSeconds per i casi puliti", () => {
    expect(parseDurationToSeconds(formatDurationSeconds(5))).toBe(5);
    expect(parseDurationToSeconds(formatDurationSeconds(5405))).toBe(5405);
  });
});
