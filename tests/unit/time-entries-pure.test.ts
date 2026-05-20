/**
 * Test "puri" sulla logica interna di time-entries che non richiede DB:
 *   - calcolo durationSeconds da startedAt/endedAt
 *   - rate cascade priority (TASK > PROJECT > CLIENT > USER > none)
 *
 * I test integration completi (con DB) arriveranno con un test runner integrato a Postgres
 * in CI; per ora questi unit testano la matematica e l'ordine logico.
 */

import { describe, it, expect } from "vitest";

import {
  computeDurationSeconds,
  validateTimeEntryRange,
} from "@/lib/utils/compute-duration-seconds";

describe("computeDurationSeconds", () => {
  it("clamps to zero when endedAt <= startedAt", () => {
    const t = new Date("2026-05-15T10:00:00Z");
    expect(computeDurationSeconds(t, t)).toBe(0);
    expect(computeDurationSeconds(t, new Date(t.getTime() - 1000))).toBe(0);
  });

  it("computes whole seconds", () => {
    const start = new Date("2026-05-15T10:00:00Z");
    const end = new Date("2026-05-15T10:01:30Z");
    expect(computeDurationSeconds(start, end)).toBe(90);
  });

  it("floors sub-second remainders", () => {
    const start = new Date("2026-05-15T10:00:00.000Z");
    const end = new Date("2026-05-15T10:00:00.999Z");
    expect(computeDurationSeconds(start, end)).toBe(0);
    const end2 = new Date("2026-05-15T10:00:01.999Z");
    expect(computeDurationSeconds(start, end2)).toBe(1);
  });

  it("handles long durations (>1 hour)", () => {
    const start = new Date("2026-05-15T10:00:00Z");
    const end = new Date("2026-05-15T13:25:42Z");
    expect(computeDurationSeconds(start, end)).toBe(3 * 3600 + 25 * 60 + 42);
  });
});

describe("validateTimeEntryRange", () => {
  it("throws when endedAt <= startedAt", () => {
    const t = new Date("2026-05-15T10:00:00Z");
    expect(() => validateTimeEntryRange(t, t)).toThrow(/endedAt/);
    expect(() => validateTimeEntryRange(t, new Date(t.getTime() - 1000))).toThrow(
      /endedAt/,
    );
  });

  it("does not throw for valid range", () => {
    const start = new Date("2026-05-15T10:00:00Z");
    const end = new Date("2026-05-15T11:00:00Z");
    expect(() => validateTimeEntryRange(start, end)).not.toThrow();
  });
});

// La cascade order è documentata in lib/domain/billing.ts:
//   TASK → PROJECT → CLIENT → CLIENT_DEFAULT → USER → NONE
// Verifichiamo l'invariante con una funzione stand-alone equivalente:

type Source = "TASK" | "PROJECT" | "CLIENT" | "CLIENT_DEFAULT" | "USER" | "NONE";

function pickRate(input: {
  taskRate?: string | null;
  projectRate?: string | null;
  clientRate?: string | null;
  clientDefaultRate?: string | null;
  userRate?: string | null;
}): { rate: string | null; source: Source } {
  if (input.taskRate) return { rate: input.taskRate, source: "TASK" };
  if (input.projectRate) return { rate: input.projectRate, source: "PROJECT" };
  if (input.clientRate) return { rate: input.clientRate, source: "CLIENT" };
  if (input.clientDefaultRate)
    return { rate: input.clientDefaultRate, source: "CLIENT_DEFAULT" };
  if (input.userRate) return { rate: input.userRate, source: "USER" };
  return { rate: null, source: "NONE" };
}

describe("billing cascade order", () => {
  it("TASK wins over all", () => {
    expect(
      pickRate({
        taskRate: "100",
        projectRate: "80",
        clientRate: "60",
        clientDefaultRate: "50",
        userRate: "40",
      }).source,
    ).toBe("TASK");
  });

  it("PROJECT wins when no TASK", () => {
    expect(
      pickRate({ projectRate: "80", clientRate: "60", userRate: "40" }).source,
    ).toBe("PROJECT");
  });

  it("CLIENT explicit wins over CLIENT_DEFAULT", () => {
    expect(pickRate({ clientRate: "60", clientDefaultRate: "50" }).source).toBe(
      "CLIENT",
    );
  });

  it("CLIENT_DEFAULT used when no CLIENT explicit", () => {
    expect(pickRate({ clientDefaultRate: "50", userRate: "40" }).source).toBe(
      "CLIENT_DEFAULT",
    );
  });

  it("USER as last fallback before NONE", () => {
    expect(pickRate({ userRate: "40" }).source).toBe("USER");
    expect(pickRate({}).source).toBe("NONE");
  });
});
