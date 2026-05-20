import { describe, it, expect } from "vitest";

import {
  parseItalianDateSupplement,
  normalizeItalianDateText,
} from "@/lib/parsers/italian-date-supplement";

const NOW = new Date("2026-05-20T12:00:00Z");
const TZ = "Europe/Rome";

describe("parseItalianDateSupplement", () => {
  it("parses dopodomani at 09:00", () => {
    const m = parseItalianDateSupplement("Chiamare dopodomani", TZ, NOW);
    expect(m?.matchedText).toBe("dopodomani");
    expect(m?.hasExplicitHour).toBe(false);
    expect(m?.date.toISOString()).toBe("2026-05-22T07:00:00.000Z");
  });

  it("parses dopodomani alle 9", () => {
    const m = parseItalianDateSupplement("dopodomani alle 9", TZ, NOW);
    expect(m?.hasExplicitHour).toBe(true);
    expect(m?.date.toISOString()).toBe("2026-05-22T07:00:00.000Z");
  });

  it("parses la settimana prossima as next Monday 09:00", () => {
    const m = parseItalianDateSupplement("Riunione la settimana prossima", TZ, NOW);
    expect(m?.matchedText).toMatch(/settimana prossima/i);
    expect(m?.date.toISOString()).toBe("2026-05-25T07:00:00.000Z");
  });

  it("parses martedì della settimana prossima", () => {
    const m = parseItalianDateSupplement(
      "Sync martedì della settimana prossima",
      TZ,
      NOW,
    );
    expect(m?.matchedText).toMatch(/martedì della settimana prossima/i);
    expect(m?.date.toISOString()).toBe("2026-05-26T07:00:00.000Z");
  });

  it("returns null when no supplement phrase", () => {
    expect(parseItalianDateSupplement("solo domani", TZ, NOW)).toBeNull();
  });
});

describe("normalizeItalianDateText", () => {
  it("adds accents to unaccented weekdays", () => {
    expect(normalizeItalianDateText("lunedi prossimo")).toBe("lunedì prossimo");
  });
});
