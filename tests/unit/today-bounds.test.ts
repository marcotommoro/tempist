import { describe, it, expect } from "vitest";
import { todayBoundsUtc } from "@/lib/domain/tasks";

describe("todayBoundsUtc", () => {
  it("computes Europe/Rome bounds correctly in CEST (summer)", () => {
    // 2026-05-15 12:00 UTC = 14:00 in Rome (CEST, UTC+2)
    const now = new Date("2026-05-15T12:00:00Z");
    const { startUtc, endUtc } = todayBoundsUtc("Europe/Rome", now);
    // Inizio giorno Rome = 00:00 locale = 22:00 UTC del giorno prima
    expect(startUtc.toISOString()).toBe("2026-05-14T22:00:00.000Z");
    // Fine giorno Rome = 23:59:59.999 locale = 21:59:59.999 UTC dello stesso giorno
    expect(endUtc.toISOString()).toBe("2026-05-15T21:59:59.999Z");
  });

  it("computes America/New_York bounds correctly in EDT", () => {
    // 2026-05-15 12:00 UTC = 08:00 in NY (EDT, UTC-4)
    const now = new Date("2026-05-15T12:00:00Z");
    const { startUtc, endUtc } = todayBoundsUtc("America/New_York", now);
    expect(startUtc.toISOString()).toBe("2026-05-15T04:00:00.000Z");
    expect(endUtc.toISOString()).toBe("2026-05-16T03:59:59.999Z");
  });

  it("computes UTC bounds correctly (identity)", () => {
    const now = new Date("2026-05-15T12:00:00Z");
    const { startUtc, endUtc } = todayBoundsUtc("UTC", now);
    expect(startUtc.toISOString()).toBe("2026-05-15T00:00:00.000Z");
    expect(endUtc.toISOString()).toBe("2026-05-15T23:59:59.999Z");
  });

  it("handles edge: just past midnight in user tz", () => {
    // 2026-05-15 00:30 UTC = 02:30 in Rome (CEST) → ancora 15 maggio
    const now = new Date("2026-05-15T00:30:00Z");
    const { startUtc, endUtc } = todayBoundsUtc("Europe/Rome", now);
    // start day Rome = 2026-05-15 00:00 local = 2026-05-14 22:00 UTC
    expect(startUtc.toISOString()).toBe("2026-05-14T22:00:00.000Z");
    expect(endUtc.toISOString()).toBe("2026-05-15T21:59:59.999Z");
  });

  it("handles edge: late evening UTC, next day in user tz", () => {
    // 2026-05-15 23:30 UTC = 01:30 16-mag in Rome (CEST)
    const now = new Date("2026-05-15T23:30:00Z");
    const { startUtc, endUtc } = todayBoundsUtc("Europe/Rome", now);
    // "today" per l'utente è il 16 maggio
    expect(startUtc.toISOString()).toBe("2026-05-15T22:00:00.000Z");
    expect(endUtc.toISOString()).toBe("2026-05-16T21:59:59.999Z");
  });
});
