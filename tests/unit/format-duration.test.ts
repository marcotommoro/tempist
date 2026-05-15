import { describe, it, expect } from "vitest";
import { formatDuration } from "@/lib/utils/format-duration";

describe("formatDuration", () => {
  it("formats less than a minute", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(59)).toBe("00:59");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("02:05");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("formats hours when present", () => {
    expect(formatDuration(3600)).toBe("01:00:00");
    expect(formatDuration(3725)).toBe("01:02:05");
    expect(formatDuration(36000)).toBe("10:00:00");
  });

  it("clamps negative values to zero", () => {
    expect(formatDuration(-1)).toBe("00:00");
    expect(formatDuration(-Infinity)).toBe("00:00");
  });

  it("ignores non-finite input", () => {
    expect(formatDuration(NaN)).toBe("00:00");
  });
});
