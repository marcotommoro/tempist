/**
 * Digest renderers — pure functions, no DB.
 * Estratti dal dominio per isolation in unit test.
 */

import type { Task } from "@/lib/db/schema";
import { formatDuration } from "@/lib/utils/format-duration";

export type DigestData = {
  date: string;
  tasksToday: Task[];
  remindersDue: { taskTitle: string; triggerAt: Date }[];
  yesterdayTrackedSeconds: number;
};

export function renderDigestText(data: DigestData): string {
  const lines: string[] = [];
  lines.push(`Digest — ${data.date}`);
  lines.push("");
  lines.push(`Task di oggi (${data.tasksToday.length}):`);
  if (data.tasksToday.length === 0) {
    lines.push("  (nessuno)");
  } else {
    for (const t of data.tasksToday) {
      lines.push(`  • [${t.priority}] ${t.title}`);
    }
  }
  lines.push("");
  lines.push(`Promemoria oggi (${data.remindersDue.length}):`);
  if (data.remindersDue.length === 0) {
    lines.push("  (nessuno)");
  } else {
    for (const r of data.remindersDue) {
      lines.push(`  • ${r.taskTitle} @ ${r.triggerAt.toISOString()}`);
    }
  }
  lines.push("");
  lines.push(
    `Ieri hai tracciato ${formatDuration(data.yesterdayTrackedSeconds)} (${(data.yesterdayTrackedSeconds / 3600).toFixed(2)}h).`,
  );
  return lines.join("\n");
}

export function renderDigestHtml(data: DigestData): string {
  const taskItems =
    data.tasksToday.length === 0
      ? "<li><em>nessuno</em></li>"
      : data.tasksToday
          .map(
            (t) =>
              `<li><strong>[${t.priority}]</strong> ${escapeHtml(t.title)}</li>`,
          )
          .join("");

  const remItems =
    data.remindersDue.length === 0
      ? "<li><em>nessuno</em></li>"
      : data.remindersDue
          .map(
            (r) =>
              `<li>${escapeHtml(r.taskTitle)} — ${r.triggerAt.toISOString()}</li>`,
          )
          .join("");

  return `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Digest — ${escapeHtml(data.date)}</h2>
<h3>Task di oggi (${data.tasksToday.length})</h3>
<ul>${taskItems}</ul>
<h3>Promemoria oggi (${data.remindersDue.length})</h3>
<ul>${remItems}</ul>
<p>Ieri hai tracciato <strong>${formatDuration(data.yesterdayTrackedSeconds)}</strong> (${(data.yesterdayTrackedSeconds / 3600).toFixed(2)}h).</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
