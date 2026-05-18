/**
 * Detect CSV source from headers. Pure function — testabile in isolation.
 */

export function detectCsvSource(
  headers: string[],
): "todoist" | "toggl" | "unknown" {
  const lower = headers.map((h) => h.toLowerCase());
  if (lower.includes("type") && lower.includes("content")) return "todoist";
  if (lower.includes("start date") && lower.includes("duration")) return "toggl";
  return "unknown";
}
