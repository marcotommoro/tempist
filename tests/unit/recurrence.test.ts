import { describe, it, expect } from "vitest";
import {
  computeNextOccurrence,
  parseRecurrence,
} from "@/lib/parsers/recurrence";

describe("parseRecurrence", () => {
  it("parses base frequencies (en + it)", () => {
    expect(parseRecurrence("daily")).toBe("FREQ=DAILY");
    expect(parseRecurrence("every day")).toBe("FREQ=DAILY");
    expect(parseRecurrence("ogni giorno")).toBe("FREQ=DAILY");
    expect(parseRecurrence("weekly")).toBe("FREQ=WEEKLY");
    expect(parseRecurrence("ogni settimana")).toBe("FREQ=WEEKLY");
    expect(parseRecurrence("monthly")).toBe("FREQ=MONTHLY");
    expect(parseRecurrence("yearly")).toBe("FREQ=YEARLY");
    expect(parseRecurrence("ogni anno")).toBe("FREQ=YEARLY");
  });

  it("parses weekday-only", () => {
    expect(parseRecurrence("every weekday")).toBe("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
    expect(parseRecurrence("ogni giorno lavorativo")).toBe(
      "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    );
  });

  it("parses specific day with accent (lunedì)", () => {
    expect(parseRecurrence("ogni lunedì")).toBe("FREQ=WEEKLY;BYDAY=MO");
    expect(parseRecurrence("every monday")).toBe("FREQ=WEEKLY;BYDAY=MO");
    expect(parseRecurrence("ogni venerdì")).toBe("FREQ=WEEKLY;BYDAY=FR");
  });

  it("passes through valid RRULE string", () => {
    expect(parseRecurrence("FREQ=DAILY;INTERVAL=2")).toBe("FREQ=DAILY;INTERVAL=2");
    expect(parseRecurrence("RRULE:FREQ=WEEKLY")).toBe("FREQ=WEEKLY");
  });

  it("returns null for unparseable input", () => {
    expect(parseRecurrence("foobar")).toBeNull();
    expect(parseRecurrence("")).toBeNull();
  });
});

describe("computeNextOccurrence", () => {
  it("DAILY: next occurrence is +1 day", () => {
    const ref = new Date("2026-05-15T10:00:00Z");
    const next = computeNextOccurrence("FREQ=DAILY", ref);
    expect(next).not.toBeNull();
    // RRULE may produce the next occurrence at midnight UTC of next day; just check > ref + 23h
    expect(next!.getTime()).toBeGreaterThan(ref.getTime() + 23 * 60 * 60 * 1000);
  });

  it("WEEKLY: next occurrence is +7 days", () => {
    const ref = new Date("2026-05-15T10:00:00Z");
    const next = computeNextOccurrence("FREQ=WEEKLY", ref);
    expect(next).not.toBeNull();
    const diff = next!.getTime() - ref.getTime();
    expect(diff).toBeGreaterThan(6 * 86400 * 1000);
    expect(diff).toBeLessThan(8 * 86400 * 1000);
  });

  it("WEEKLY BYDAY=MO: from friday returns next monday", () => {
    // 2026-05-15 is Friday
    const friday = new Date("2026-05-15T10:00:00Z");
    const next = computeNextOccurrence("FREQ=WEEKLY;BYDAY=MO", friday);
    expect(next).not.toBeNull();
    expect(next!.getUTCDay()).toBe(1); // Monday
  });

  it("returns null for invalid RRULE", () => {
    expect(computeNextOccurrence("NOT_AN_RRULE", new Date())).toBeNull();
  });
});
