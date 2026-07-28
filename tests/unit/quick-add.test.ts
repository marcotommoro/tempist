import { describe, it, expect } from "vitest";
import { parseQuickAdd } from "@/lib/parsers/quick-add";

// Fixed reference: Wednesday 2026-05-20 12:00 UTC (14:00 Europe/Rome CEST)
const NOW = new Date("2026-05-20T12:00:00Z");
const TZ = "Europe/Rome";

const parse = (input: string) => parseQuickAdd(input, { now: NOW, timezone: TZ });

describe("parseQuickAdd", () => {
  it("returns plain title when no tokens", () => {
    const r = parse("Comprare il pane");
    expect(r.title).toBe("Comprare il pane");
    expect(r.scheduledAt).toBeNull();
    expect(r.priority).toBe("P4");
    expect(r.projectName).toBeNull();
    expect(r.labelNames).toEqual([]);
    expect(r.clientName).toBeNull();
  });

  it("extracts #project (last one wins)", () => {
    const r = parse("Task #Acme another #Foo");
    expect(r.projectName).toBe("Foo");
    expect(r.title).toBe("Task another");
  });

  it("extracts multiple @labels", () => {
    const r = parse("Task @urgent @client");
    expect(r.labelNames).toEqual(["urgent", "client"]);
    expect(r.title).toBe("Task");
  });

  it("extracts priority case-insensitive", () => {
    expect(parse("Task P1").priority).toBe("P1");
    expect(parse("Task p2").priority).toBe("P2");
    expect(parse("Task p3 then more text").priority).toBe("P3");
  });

  it("ignores p-letter-not-priority", () => {
    // "pizza" non deve essere priority
    const r = parse("pizza p4");
    expect(r.title).toBe("pizza");
    expect(r.priority).toBe("P4");
  });

  it("extracts !cliente:Name and !client:Name", () => {
    expect(parse("Task !cliente:Rossi").clientName).toBe("Rossi");
    expect(parse("Task !client:Acme_Inc").clientName).toBe("Acme_Inc");
  });

  it("treats bare durations as relative times, non come stima", () => {
    // Senza estimate, "30m" resta solo un'espressione temporale per chrono:
    // pianifica il task fra 30 minuti (visibile nell'anteprima prima di salvare).
    const r = parse("Fix bug 30m");
    expect(r.title).toBe("Fix bug");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-20T12:30:00.000Z");
  });

  it("parses relative date with chrono (tomorrow EN)", () => {
    const r = parse("Chiamare Mario tomorrow at 3pm");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-21T13:00:00.000Z");
    expect(r.title).toBe("Chiamare Mario");
  });

  it("parses domani at 09:00 when no time given", () => {
    const r = parse("Chiamare Mario domani");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-21T07:00:00.000Z");
    expect(r.title).toBe("Chiamare Mario");
  });

  it("parses domani alle 10", () => {
    const r = parse("Task domani alle 10");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-21T08:00:00.000Z");
    expect(r.title).toBe("Task");
  });

  it("parses dopodomani alle 9", () => {
    const r = parse("Task dopodomani alle 9");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-22T07:00:00.000Z");
  });

  // Regression: chrono-node non riconosce i nomi IANA ("Europe/Rome") e senza
  // conversione in offset farebbe fallback al tz di sistema del server.
  // In produzione (Docker, UTC) "10:30" veniva salvato come 10:30Z → mostrato 12:30.
  it("parses bare time 10:30 in user timezone, not system timezone", () => {
    // 10:30 Roma < ore 14:00 locali del riferimento → forwardDate spinge a domani
    const r = parse("Task 10:30");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-21T08:30:00.000Z");
    expect(r.title).toBe("Task");
  });

  it("parses domani alle 10:30 in user timezone", () => {
    const r = parse("Task domani alle 10:30");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-21T08:30:00.000Z");
    expect(r.title).toBe("Task");
  });

  it("honors a non-default IANA timezone option", () => {
    const r = parseQuickAdd("Task tomorrow at 10:30", {
      now: NOW,
      timezone: "America/New_York", // EDT = UTC-4 a maggio
    });
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-21T14:30:00.000Z");
  });

  it("parses la settimana prossima as next Monday 09:00", () => {
    const r = parse("Riunione la settimana prossima");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-25T07:00:00.000Z");
    expect(r.title).toBe("Riunione");
  });

  it("parses lunedì della settimana prossima", () => {
    const r = parse("Call lunedì della settimana prossima");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-25T07:00:00.000Z");
    expect(r.title).toBe("Call");
  });

  it("parses mixed tokens with domani", () => {
    const r = parse("Task domani #Acme p1");
    expect(r.scheduledAt?.toISOString()).toBe("2026-05-21T07:00:00.000Z");
    expect(r.projectName).toBe("Acme");
    expect(r.priority).toBe("P1");
    expect(r.title).toBe("Task");
  });

  it("handles the full spec example", () => {
    const r = parse(
      "Chiamare Mario tomorrow 15:00 #ProjectAcme @urgent p1 !cliente:Rossi",
    );
    expect(r.title).toBe("Chiamare Mario");
    expect(r.scheduledAt).not.toBeNull();
    expect(r.priority).toBe("P1");
    expect(r.projectName).toBe("ProjectAcme");
    expect(r.labelNames).toEqual(["urgent"]);
    expect(r.clientName).toBe("Rossi");
  });

  it("token order does not matter", () => {
    const a = parse("Task p1 #Proj @lbl");
    const b = parse("Task @lbl #Proj p1");
    expect(a.title).toBe(b.title);
    expect(a.priority).toBe(b.priority);
    expect(a.projectName).toBe(b.projectName);
    expect(a.labelNames).toEqual(b.labelNames);
  });

  it("supports unicode names (italian accents)", () => {
    const r = parse("Riunione #Città @riunioni");
    expect(r.projectName).toBe("Città");
    expect(r.labelNames).toEqual(["riunioni"]);
  });

  it("collapses extra whitespace in title", () => {
    const r = parse("  Task   with    spaces  #P  ");
    expect(r.title).toBe("Task with spaces");
  });

  it("extracts repeats:VALUE → RRULE string", () => {
    expect(parse("Daily standup repeats:daily")).toMatchObject({
      title: "Daily standup",
      recurrenceRule: "FREQ=DAILY",
    });
    expect(parse("Weekly review repeats:weekly")).toMatchObject({
      title: "Weekly review",
      recurrenceRule: "FREQ=WEEKLY",
    });
    expect(parse("Stand up repeats:every monday p1")).toMatchObject({
      title: "Stand up",
      priority: "P1",
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
    });
  });

  it("repeats with unknown keyword → recurrenceRule null but token still extracted", () => {
    const r = parse("Task repeats:nonsense");
    expect(r.title).toBe("Task");
    expect(r.recurrenceRule).toBeNull();
  });
});
