import { parseQuickAdd, type Priority } from "./quick-add";

export function resolveTaskFromTitle(
  rawTitle: string,
  options: { timezone: string; now?: Date },
): {
  title: string;
  scheduledAt: Date | null;
  priority: Priority;
} {
  const parsed = parseQuickAdd(rawTitle, options);
  return {
    title: parsed.title || rawTitle.trim(),
    scheduledAt: parsed.scheduledAt,
    priority: parsed.priority,
  };
}
