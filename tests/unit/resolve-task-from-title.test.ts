import { describe, it, expect } from "vitest";

import { resolveTaskFromTitle } from "@/lib/parsers/resolve-task-from-title";

const NOW = new Date("2026-05-20T12:00:00Z");
const TZ = "Europe/Rome";

describe("resolveTaskFromTitle", () => {
  it("extracts date and clean title from Italian phrase", () => {
    const r = resolveTaskFromTitle("Riunione domani alle 10", { now: NOW, timezone: TZ });
    expect(r.title).toBe("Riunione");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-21T08:00:00.000Z");
  });

  it("returns null scheduledAt when no date token", () => {
    const r = resolveTaskFromTitle("Solo titolo", { now: NOW, timezone: TZ });
    expect(r.title).toBe("Solo titolo");
    expect(r.scheduledAt).toBeNull();
  });
});
