import { describe, it, expect } from "vitest";

import {
  computeTriggerTime,
  formatRelativeOffset,
  parseRelativeOffset,
} from "@/lib/utils/reminder-time";

describe("parseRelativeOffset", () => {
  it("parses minutes/hours/days/weeks with default negative sign", () => {
    expect(parseRelativeOffset("30m")).toEqual({ offsetMs: -30 * 60_000 });
    expect(parseRelativeOffset("1h")).toEqual({ offsetMs: -60 * 60_000 });
    expect(parseRelativeOffset("2d")).toEqual({ offsetMs: -2 * 24 * 60 * 60_000 });
    expect(parseRelativeOffset("1w")).toEqual({ offsetMs: -7 * 24 * 60 * 60_000 });
  });

  it("respects explicit minus sign", () => {
    expect(parseRelativeOffset("-30m")?.offsetMs).toBe(-30 * 60_000);
    expect(parseRelativeOffset("-1h")?.offsetMs).toBe(-60 * 60_000);
  });

  it("respects explicit plus sign for offsets after scheduledAt", () => {
    expect(parseRelativeOffset("+1h")?.offsetMs).toBe(60 * 60_000);
  });

  it("rejects malformed input", () => {
    expect(parseRelativeOffset("abc")).toBeNull();
    expect(parseRelativeOffset("1x")).toBeNull();
    expect(parseRelativeOffset("")).toBeNull();
    expect(parseRelativeOffset("h1")).toBeNull();
  });
});

describe("computeTriggerTime", () => {
  it("returns parsed Date for TIME with valid ISO", () => {
    const t = computeTriggerTime({
      triggerType: "TIME",
      triggerValue: "2026-05-20T08:00:00.000Z",
      taskScheduledAt: null,
    });
    expect(t?.toISOString()).toBe("2026-05-20T08:00:00.000Z");
  });

  it("returns null for TIME with invalid ISO", () => {
    expect(
      computeTriggerTime({
        triggerType: "TIME",
        triggerValue: "not-a-date",
        taskScheduledAt: null,
      }),
    ).toBeNull();
  });

  it("returns null for RELATIVE without scheduledAt", () => {
    expect(
      computeTriggerTime({
        triggerType: "RELATIVE",
        triggerValue: "-1h",
        taskScheduledAt: null,
      }),
    ).toBeNull();
  });

  it("computes RELATIVE offset before scheduledAt", () => {
    const scheduled = new Date("2026-05-20T10:00:00.000Z");
    const t = computeTriggerTime({
      triggerType: "RELATIVE",
      triggerValue: "-1h",
      taskScheduledAt: scheduled,
    });
    expect(t?.toISOString()).toBe("2026-05-20T09:00:00.000Z");
  });

  it("computes RELATIVE offset for -1d", () => {
    const scheduled = new Date("2026-05-20T10:00:00.000Z");
    const t = computeTriggerTime({
      triggerType: "RELATIVE",
      triggerValue: "-1d",
      taskScheduledAt: scheduled,
    });
    expect(t?.toISOString()).toBe("2026-05-19T10:00:00.000Z");
  });

  it("supports +1h (offset DOPO scheduledAt)", () => {
    const scheduled = new Date("2026-05-20T10:00:00.000Z");
    const t = computeTriggerTime({
      triggerType: "RELATIVE",
      triggerValue: "+1h",
      taskScheduledAt: scheduled,
    });
    expect(t?.toISOString()).toBe("2026-05-20T11:00:00.000Z");
  });
});

describe("formatRelativeOffset", () => {
  it("formats negative offsets as 'prima'", () => {
    expect(formatRelativeOffset("-30m")).toBe("30 min prima");
    expect(formatRelativeOffset("-1h")).toBe("1 ora prima");
    expect(formatRelativeOffset("-2h")).toBe("2 ore prima");
    expect(formatRelativeOffset("-1d")).toBe("1 giorno prima");
    expect(formatRelativeOffset("-3d")).toBe("3 giorni prima");
    expect(formatRelativeOffset("-1w")).toBe("1 settimana prima");
  });

  it("formats positive offsets as 'dopo'", () => {
    expect(formatRelativeOffset("+1h")).toBe("1 ora dopo");
  });

  it("returns value as-is for unparseable input", () => {
    expect(formatRelativeOffset("garbage")).toBe("garbage");
  });
});
