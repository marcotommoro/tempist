import { describe, it, expect } from "vitest";

import { buildCsv } from "@/lib/utils/csv";

describe("buildCsv", () => {
  it("emits BOM + header + rows with CRLF", () => {
    const csv = buildCsv(["a", "b"], [["1", "2"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("a,b\r\n1,2\r\n");
  });

  it("quotes cells containing comma, quote, or newline", () => {
    const csv = buildCsv(["a", "b"], [
      ["hello, world", 'with "quote"'],
      ["multi\nline", "plain"],
    ]);
    expect(csv).toContain('"hello, world"');
    expect(csv).toContain('"with ""quote"""');
    expect(csv).toContain('"multi\nline"');
  });

  it("handles null/undefined as empty string", () => {
    const csv = buildCsv(["a"], [[null], [undefined]]);
    expect(csv).toContain("\r\n\r\n\r\n"); // empty rows
  });

  it("formats Date as ISO string", () => {
    const d = new Date("2026-05-20T10:00:00.000Z");
    const csv = buildCsv(["t"], [[d]]);
    expect(csv).toContain("2026-05-20T10:00:00.000Z");
  });

  it("converts boolean to 'true'/'false'", () => {
    const csv = buildCsv(["b"], [[true], [false]]);
    expect(csv).toContain("\r\ntrue\r\n");
    expect(csv).toContain("\r\nfalse\r\n");
  });
});
