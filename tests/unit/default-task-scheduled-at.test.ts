import { describe, it, expect } from "vitest";

import { defaultTaskScheduledAt } from "@/lib/utils/default-task-scheduled-at";

describe("defaultTaskScheduledAt", () => {
  it("returns tomorrow 09:00 in Europe/Rome", () => {
    const now = new Date("2026-05-20T12:00:00Z");
    const scheduled = defaultTaskScheduledAt("Europe/Rome", now);
    expect(scheduled.toISOString()).toBe("2026-05-21T07:00:00.000Z");
  });

  it("returns tomorrow 09:00 in America/New_York (EDT)", () => {
    const now = new Date("2026-05-20T12:00:00Z");
    const scheduled = defaultTaskScheduledAt("America/New_York", now);
    expect(scheduled.toISOString()).toBe("2026-05-21T13:00:00.000Z");
  });
});
