import { describe, it, expect } from "vitest";

import { parseCsv } from "@/lib/utils/csv-parse";

describe("parseCsv", () => {
  it("parses basic CSV", () => {
    const { headers, rows } = parseCsv("a,b,c\n1,2,3\n4,5,6\n");
    expect(headers).toEqual(["a", "b", "c"]);
    expect(rows).toEqual([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
  });

  it("strips BOM at the start", () => {
    const { headers } = parseCsv("﻿a,b\n1,2");
    expect(headers).toEqual(["a", "b"]);
  });

  it("handles quoted cells with comma", () => {
    const { rows } = parseCsv('a,b\n"hello, world","foo"\n');
    expect(rows[0]).toEqual({ a: "hello, world", b: "foo" });
  });

  it('handles escaped quotes ""', () => {
    const { rows } = parseCsv('a\n"she said ""hi"""\n');
    expect(rows[0]).toEqual({ a: 'she said "hi"' });
  });

  it("handles CRLF line endings", () => {
    const { rows } = parseCsv("a,b\r\n1,2\r\n3,4\r\n");
    expect(rows).toHaveLength(2);
  });

  it("handles multi-line cells inside quotes", () => {
    const { rows } = parseCsv('a,b\n"line1\nline2","plain"\n');
    expect(rows[0]?.a).toBe("line1\nline2");
  });

  it("skips empty trailing lines", () => {
    const { rows } = parseCsv("a\n1\n\n");
    expect(rows).toHaveLength(1);
  });

  it("handles missing trailing newline", () => {
    const { rows } = parseCsv("a,b\n1,2");
    expect(rows).toEqual([{ a: "1", b: "2" }]);
  });
});
