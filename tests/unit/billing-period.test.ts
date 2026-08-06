import { describe, it, expect } from "vitest";

import {
  getGridDisplayDays,
  resolveBillingRange,
  toDateParam,
} from "@/lib/utils/billing-period";

describe("resolveBillingRange", () => {
  it("defaults to current month", () => {
    const r = resolveBillingRange({});
    expect(r.active).toBe("month");
    expect(r.from.getDate()).toBe(1);
    const now = new Date();
    expect(r.from.getMonth()).toBe(now.getMonth());
  });

  it("resolves last-month preset", () => {
    const r = resolveBillingRange({ preset: "last-month" });
    expect(r.active).toBe("last-month");
    const now = new Date();
    const expected = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    expect(r.from.getMonth()).toBe(expected.getMonth());
  });

  it("resolves custom from/to", () => {
    const r = resolveBillingRange({ from: "2026-05-01", to: "2026-05-20" });
    expect(r.active).toBe("custom");
    expect(toDateParam(r.from)).toBe("2026-05-01");
    expect(toDateParam(r.toInclusive)).toBe("2026-05-20");
  });
});

describe("getGridDisplayDays", () => {
  it("returns all days in a month preset", () => {
    const range = resolveBillingRange({ preset: "month" });
    const days = getGridDisplayDays(range);
    expect(days.length).toBeGreaterThan(27);
    expect(days.length).toBeLessThan(32);
  });

  it("caps custom ranges longer than 31 days", () => {
    const range = resolveBillingRange({ from: "2026-01-01", to: "2026-03-31" });
    const days = getGridDisplayDays(range);
    expect(days.length).toBe(31);
  });

  it("for all preset shows current month days", () => {
    const range = resolveBillingRange({ preset: "all" });
    const days = getGridDisplayDays(range);
    const now = new Date();
    expect(days[0]?.getMonth()).toBe(now.getMonth());
    expect(days.length).toBeGreaterThan(27);
  });
});
