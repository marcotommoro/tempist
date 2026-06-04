import { describe, it, expect } from "vitest";

import {
  defaultFilters,
  parseFilters,
  resolveDateRange,
  resolvePreviousRange,
  serializeFilters,
  type ReportFilters,
} from "@/lib/reports/filters";

describe("defaultFilters", () => {
  it("org scope: this-month / group by client / chart", () => {
    const f = defaultFilters({ kind: "org" });
    expect(f.preset).toBe("this-month");
    expect(f.groupBy).toBe("client");
    expect(f.view).toBe("chart");
    expect(f.compare).toBe(false);
    expect(f.metric).toBe("hours");
    expect(f.months).toEqual([]);
  });

  it("user scope (timesheet): group by day / table", () => {
    const f = defaultFilters({ kind: "user", userId: "u1" });
    expect(f.groupBy).toBe("day");
    expect(f.view).toBe("table");
  });

  it("client scope: group by project / table", () => {
    const f = defaultFilters({ kind: "client", clientId: "c1" });
    expect(f.groupBy).toBe("project");
    expect(f.view).toBe("table");
  });
});

describe("parseFilters / serializeFilters", () => {
  const scope = { kind: "org" } as const;

  it("round-trips a fully non-default filter set", () => {
    const original: ReportFilters = {
      ...defaultFilters(scope),
      preset: "custom",
      from: "2026-03-01",
      to: "2026-03-31",
      groupBy: "project",
      view: "table",
      clientIds: ["c1", "c2"],
      projectIds: ["p1"],
      compare: true,
      metric: "amount",
    };
    const qs = serializeFilters(original);
    const parsed = parseFilters(new URLSearchParams(qs), scope);
    expect(parsed).toEqual(original);
  });

  it("omits defaults → empty query string", () => {
    expect(serializeFilters(defaultFilters(scope))).toBe("");
  });

  it("falls back to defaults for unknown / empty values", () => {
    const parsed = parseFilters(new URLSearchParams("groupBy=bogus&view="), scope);
    expect(parsed.groupBy).toBe("client");
    expect(parsed.view).toBe("chart");
  });

  it("parses comma-separated clientIds and months", () => {
    const parsed = parseFilters(
      new URLSearchParams("clientIds=a,b,c&months=2026-01,2026-02"),
      scope,
    );
    expect(parsed.clientIds).toEqual(["a", "b", "c"]);
    expect(parsed.months).toEqual(["2026-01", "2026-02"]);
  });
});

describe("resolveDateRange (UTC)", () => {
  const now = new Date("2026-05-20T12:00:00Z"); // mercoledì

  it("this-month → [May 1, Jun 1)", () => {
    const f = { ...defaultFilters({ kind: "org" }), preset: "this-month" as const };
    const { from, to } = resolveDateRange(f, "UTC", now);
    expect(from.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("last-month → [Apr 1, May 1)", () => {
    const f = { ...defaultFilters({ kind: "org" }), preset: "last-month" as const };
    const { from, to } = resolveDateRange(f, "UTC", now);
    expect(from.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("quarter → [Apr 1, Jul 1) for a May date", () => {
    const f = { ...defaultFilters({ kind: "org" }), preset: "quarter" as const };
    const { from, to } = resolveDateRange(f, "UTC", now);
    expect(from.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("year → [Jan 1, next Jan 1)", () => {
    const f = { ...defaultFilters({ kind: "org" }), preset: "year" as const };
    const { from, to } = resolveDateRange(f, "UTC", now);
    expect(from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("custom: 'to' is inclusive day → exclusive next midnight", () => {
    const f = {
      ...defaultFilters({ kind: "org" }),
      preset: "custom" as const,
      from: "2026-03-01",
      to: "2026-03-15",
    };
    const { from, to } = resolveDateRange(f, "UTC", now);
    expect(from.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-03-16T00:00:00.000Z");
  });

  it("months[] spans earliest start → latest end (exclusive), overriding preset", () => {
    const f = {
      ...defaultFilters({ kind: "org" }),
      preset: "this-month" as const,
      months: ["2026-04", "2026-02"], // unordered on purpose
    };
    const { from, to } = resolveDateRange(f, "UTC", now);
    expect(from.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });
});

describe("resolveDateRange (Europe/Rome, CEST UTC+2)", () => {
  const now = new Date("2026-05-20T12:00:00Z");

  it("this-month start is Apr 30 22:00 UTC", () => {
    const f = { ...defaultFilters({ kind: "org" }), preset: "this-month" as const };
    const { from } = resolveDateRange(f, "Europe/Rome", now);
    expect(from.toISOString()).toBe("2026-04-30T22:00:00.000Z");
  });
});

describe("resolvePreviousRange (UTC) — confronto periodi", () => {
  const now = new Date("2026-05-20T12:00:00Z");

  it("this-month → mese di calendario precedente [Apr 1, May 1)", () => {
    const f = { ...defaultFilters({ kind: "org" }), preset: "this-month" as const };
    const { from, to } = resolvePreviousRange(f, "UTC", now);
    expect(from.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("quarter → trimestre precedente [Jan 1, Apr 1)", () => {
    const f = { ...defaultFilters({ kind: "org" }), preset: "quarter" as const };
    const { from, to } = resolvePreviousRange(f, "UTC", now);
    expect(from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("year → anno precedente [Jan 1 2025, Jan 1 2026)", () => {
    const f = { ...defaultFilters({ kind: "org" }), preset: "year" as const };
    const { from, to } = resolvePreviousRange(f, "UTC", now);
    expect(from.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("custom di N giorni → gli N giorni subito prima di 'from'", () => {
    const f = {
      ...defaultFilters({ kind: "org" }),
      preset: "custom" as const,
      from: "2026-03-10",
      to: "2026-03-19", // periodo corrente [Mar 10, Mar 20) = 10 giorni
    };
    const { from, to } = resolvePreviousRange(f, "UTC", now);
    expect(to.toISOString()).toBe("2026-03-10T00:00:00.000Z");
    expect(from.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
});
