import { describe, it, expect } from "vitest";
import { parseQuickAdd } from "@/lib/parsers/quick-add";

// Fixed reference: friday 2026-05-15 12:00 UTC
const NOW = new Date("2026-05-15T12:00:00Z");

describe("parseQuickAdd", () => {
  it("returns plain title when no tokens", () => {
    const r = parseQuickAdd("Comprare il pane", { now: NOW });
    expect(r.title).toBe("Comprare il pane");
    expect(r.scheduledAt).toBeNull();
    expect(r.priority).toBe("P4");
    expect(r.projectName).toBeNull();
    expect(r.labelNames).toEqual([]);
    expect(r.estimatedMinutes).toBeNull();
    expect(r.clientName).toBeNull();
  });

  it("extracts #project (last one wins)", () => {
    const r = parseQuickAdd("Task #Acme another #Foo", { now: NOW });
    expect(r.projectName).toBe("Foo");
    expect(r.title).toBe("Task another");
  });

  it("extracts multiple @labels", () => {
    const r = parseQuickAdd("Task @urgent @client", { now: NOW });
    expect(r.labelNames).toEqual(["urgent", "client"]);
    expect(r.title).toBe("Task");
  });

  it("extracts priority case-insensitive", () => {
    expect(parseQuickAdd("Task P1", { now: NOW }).priority).toBe("P1");
    expect(parseQuickAdd("Task p2", { now: NOW }).priority).toBe("P2");
    expect(parseQuickAdd("Task p3 then more text", { now: NOW }).priority).toBe(
      "P3",
    );
  });

  it("ignores p-letter-not-priority", () => {
    // "pizza" non deve essere priority
    const r = parseQuickAdd("pizza p4", { now: NOW });
    expect(r.title).toBe("pizza");
    expect(r.priority).toBe("P4");
  });

  it("extracts !cliente:Name and !client:Name", () => {
    expect(parseQuickAdd("Task !cliente:Rossi", { now: NOW }).clientName).toBe(
      "Rossi",
    );
    expect(parseQuickAdd("Task !client:Acme_Inc", { now: NOW }).clientName).toBe(
      "Acme_Inc",
    );
  });

  it("extracts duration in minutes only", () => {
    expect(parseQuickAdd("Task 60min", { now: NOW }).estimatedMinutes).toBe(60);
    expect(parseQuickAdd("Task 30mins", { now: NOW }).estimatedMinutes).toBe(30);
    expect(parseQuickAdd("Task 15m", { now: NOW }).estimatedMinutes).toBe(15);
  });

  it("extracts duration in hours and combined", () => {
    expect(parseQuickAdd("Task 2h", { now: NOW }).estimatedMinutes).toBe(120);
    expect(parseQuickAdd("Task 1h30m", { now: NOW }).estimatedMinutes).toBe(90);
    expect(parseQuickAdd("Task 1h30", { now: NOW }).estimatedMinutes).toBe(90);
  });

  it("parses relative date with chrono (tomorrow)", () => {
    const r = parseQuickAdd("Chiamare Mario tomorrow at 3pm", { now: NOW });
    expect(r.scheduledAt).not.toBeNull();
    // tomorrow 15:00 in some timezone (chrono usa local server tz)
    expect(r.title).toBe("Chiamare Mario");
  });

  it("handles the full spec example", () => {
    const r = parseQuickAdd(
      "Chiamare Mario tomorrow 15:00 #ProjectAcme @urgent p1 60min !cliente:Rossi",
      { now: NOW },
    );
    expect(r.title).toBe("Chiamare Mario");
    expect(r.scheduledAt).not.toBeNull();
    expect(r.priority).toBe("P1");
    expect(r.projectName).toBe("ProjectAcme");
    expect(r.labelNames).toEqual(["urgent"]);
    expect(r.estimatedMinutes).toBe(60);
    expect(r.clientName).toBe("Rossi");
  });

  it("token order does not matter", () => {
    const a = parseQuickAdd("Task p1 #Proj @lbl 30min", { now: NOW });
    const b = parseQuickAdd("Task 30min @lbl #Proj p1", { now: NOW });
    expect(a.title).toBe(b.title);
    expect(a.priority).toBe(b.priority);
    expect(a.projectName).toBe(b.projectName);
    expect(a.labelNames).toEqual(b.labelNames);
    expect(a.estimatedMinutes).toBe(b.estimatedMinutes);
  });

  it("supports unicode names (italian accents)", () => {
    const r = parseQuickAdd("Riunione #Città @riunioni", { now: NOW });
    expect(r.projectName).toBe("Città");
    expect(r.labelNames).toEqual(["riunioni"]);
  });

  it("collapses extra whitespace in title", () => {
    const r = parseQuickAdd("  Task   with    spaces  #P  ", { now: NOW });
    expect(r.title).toBe("Task with spaces");
  });

  it("extracts repeats:VALUE → RRULE string", () => {
    expect(parseQuickAdd("Daily standup repeats:daily", { now: NOW })).toMatchObject({
      title: "Daily standup",
      recurrenceRule: "FREQ=DAILY",
    });
    expect(parseQuickAdd("Weekly review repeats:weekly", { now: NOW })).toMatchObject({
      title: "Weekly review",
      recurrenceRule: "FREQ=WEEKLY",
    });
    expect(parseQuickAdd("Stand up repeats:every monday p1", { now: NOW })).toMatchObject({
      title: "Stand up",
      priority: "P1",
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
    });
  });

  it("repeats with unknown keyword → recurrenceRule null but token still extracted", () => {
    const r = parseQuickAdd("Task repeats:nonsense", { now: NOW });
    expect(r.title).toBe("Task");
    expect(r.recurrenceRule).toBeNull();
  });
});
