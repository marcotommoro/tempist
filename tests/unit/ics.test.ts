import { describe, it, expect } from "vitest";

import { buildIcs } from "@/lib/utils/ics";

describe("buildIcs", () => {
  it("wraps events in VCALENDAR with required headers", () => {
    const ics = buildIcs({
      prodId: "-//test//IT",
      events: [
        {
          uid: "t1@test",
          summary: "Task uno",
          start: new Date("2026-05-20T10:00:00.000Z"),
          end: new Date("2026-05-20T11:00:00.000Z"),
          lastModified: new Date("2026-05-19T09:00:00.000Z"),
        },
      ],
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//test//IT");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("formats UTC stamps without dashes/colons/millis", () => {
    const ics = buildIcs({
      prodId: "x",
      events: [
        {
          uid: "u",
          summary: "s",
          start: new Date("2026-05-20T10:30:00.000Z"),
          end: new Date("2026-05-20T11:30:00.000Z"),
          lastModified: new Date("2026-05-20T09:00:00.000Z"),
        },
      ],
    });
    expect(ics).toContain("DTSTART:20260520T103000Z");
    expect(ics).toContain("DTEND:20260520T113000Z");
  });

  it("defaults end to start + 1h when end omitted", () => {
    const ics = buildIcs({
      prodId: "x",
      events: [
        {
          uid: "u",
          summary: "s",
          start: new Date("2026-05-20T10:00:00.000Z"),
          lastModified: new Date("2026-05-20T09:00:00.000Z"),
        },
      ],
    });
    expect(ics).toContain("DTSTART:20260520T100000Z");
    expect(ics).toContain("DTEND:20260520T110000Z");
  });

  it("escapes special chars in SUMMARY/DESCRIPTION", () => {
    const ics = buildIcs({
      prodId: "x",
      events: [
        {
          uid: "u",
          summary: "task, with; chars",
          description: "line1\nline2",
          start: new Date("2026-05-20T10:00:00.000Z"),
          lastModified: new Date(),
        },
      ],
    });
    expect(ics).toContain("SUMMARY:task\\, with\\; chars");
    expect(ics).toContain("DESCRIPTION:line1\\nline2");
  });

  it("adds STATUS:COMPLETED when completedAt present", () => {
    const ics = buildIcs({
      prodId: "x",
      events: [
        {
          uid: "u",
          summary: "done",
          start: new Date("2026-05-20T10:00:00.000Z"),
          lastModified: new Date(),
          completedAt: new Date("2026-05-21T08:00:00.000Z"),
        },
      ],
    });
    expect(ics).toContain("STATUS:COMPLETED");
  });

  it("produces CRLF line endings as per RFC 5545", () => {
    const ics = buildIcs({
      prodId: "x",
      events: [],
    });
    expect(ics).toContain("\r\n");
  });
});
