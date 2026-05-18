import { describe, it, expect } from "vitest";

import { detectCsvSource } from "@/lib/utils/import-detect";

describe("detectCsvSource", () => {
  it("identifies Todoist by TYPE+CONTENT", () => {
    expect(
      detectCsvSource(["TYPE", "CONTENT", "DESCRIPTION", "PRIORITY"]),
    ).toBe("todoist");
  });

  it("identifies Toggl by 'Start date' + Duration", () => {
    expect(
      detectCsvSource([
        "User",
        "Email",
        "Client",
        "Project",
        "Start date",
        "Start time",
        "Duration",
      ]),
    ).toBe("toggl");
  });

  it("returns unknown for unrelated headers", () => {
    expect(detectCsvSource(["foo", "bar", "baz"])).toBe("unknown");
  });

  it("is case-insensitive", () => {
    expect(detectCsvSource(["type", "content"])).toBe("todoist");
  });
});
