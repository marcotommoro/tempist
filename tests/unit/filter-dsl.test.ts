import { describe, it, expect } from "vitest";
import { parseFilter } from "@/lib/parsers/filter-dsl";

describe("parseFilter", () => {
  it("empty input → defaults", () => {
    const r = parseFilter("");
    expect(r.status).toBe("open");
    expect(r.priorities).toEqual([]);
    expect(r.labelNames).toEqual([]);
    expect(r.due).toBeNull();
    expect(r.textQuery).toBeNull();
  });

  it("priorities single + list", () => {
    expect(parseFilter("priority:P1").priorities).toEqual(["P1"]);
    expect(parseFilter("priority:P1,P2").priorities).toEqual(["P1", "P2"]);
    expect(parseFilter("P2 p3").priorities).toEqual(["P2", "P3"]);
  });

  it("labels", () => {
    expect(parseFilter("@urgent @client").labelNames).toEqual(["urgent", "client"]);
  });

  it("due ranges", () => {
    expect(parseFilter("due:today").due).toEqual({ kind: "today" });
    expect(parseFilter("due:overdue").due).toEqual({ kind: "overdue" });
    expect(parseFilter("due:7d").due).toEqual({ kind: "withinDays", days: 7 });
    expect(parseFilter("due:30d").due).toEqual({ kind: "withinDays", days: 30 });
    expect(parseFilter("due:notvalid").due).toBeNull();
  });

  it("status", () => {
    expect(parseFilter("is:open").status).toBe("open");
    expect(parseFilter("is:completed").status).toBe("completed");
    expect(parseFilter("is:all").status).toBe("all");
  });

  it("project + client", () => {
    const r = parseFilter("project:Acme client:Rossi");
    expect(r.projectName).toBe("Acme");
    expect(r.clientName).toBe("Rossi");
  });

  it("text query is everything else", () => {
    const r = parseFilter("important meeting priority:P1 @urgent");
    expect(r.textQuery).toBe("important meeting");
    expect(r.priorities).toEqual(["P1"]);
    expect(r.labelNames).toEqual(["urgent"]);
  });

  it("dedup priorities + labels", () => {
    const r = parseFilter("P1 P1 @a @a @a");
    expect(r.priorities).toEqual(["P1"]);
    expect(r.labelNames).toEqual(["a"]);
  });

  it("full spec example", () => {
    const r = parseFilter("priority:P1 @urgent due:7d is:open");
    expect(r.priorities).toEqual(["P1"]);
    expect(r.labelNames).toEqual(["urgent"]);
    expect(r.due).toEqual({ kind: "withinDays", days: 7 });
    expect(r.status).toBe("open");
    expect(r.textQuery).toBeNull();
  });
});
