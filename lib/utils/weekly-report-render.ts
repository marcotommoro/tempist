/**
 * Weekly report renderers — pure, isolated for testing.
 */

export type WeeklyClientRow = {
  name: string;
  currency: string;
  totalSeconds: number;
  billableAmount: number;
  entryCount: number;
  completedTasks: number;
};

export type WeeklyReportData = {
  rangeLabel: string;
  rows: WeeklyClientRow[];
  totalSeconds: number;
  completedTasks: number;
  billableByCurrency: Map<string, number>;
};

function hours(s: number): string {
  return (s / 3600).toFixed(2);
}

export function renderWeeklyReportText(data: WeeklyReportData): string {
  const lines: string[] = [];
  lines.push(`Report settimanale — ${data.rangeLabel}`);
  lines.push("");
  lines.push(`Ore totali: ${hours(data.totalSeconds)}h`);
  lines.push(`Task completati: ${data.completedTasks}`);
  if (data.billableByCurrency.size > 0) {
    const parts = Array.from(data.billableByCurrency.entries())
      .map(([cur, amt]) => `${amt.toFixed(2)} ${cur}`)
      .join(" · ");
    lines.push(`Fatturabile: ${parts}`);
  }
  lines.push("");
  lines.push("Per cliente:");
  if (data.rows.length === 0) {
    lines.push("  (nessuno)");
  } else {
    for (const r of data.rows) {
      lines.push(
        `  • ${r.name}: ${hours(r.totalSeconds)}h · ${r.entryCount} voci · ${r.completedTasks} task` +
          (r.billableAmount > 0
            ? ` · ${r.billableAmount.toFixed(2)} ${r.currency}`
            : ""),
      );
    }
  }
  return lines.join("\n");
}

export function renderWeeklyReportHtml(data: WeeklyReportData): string {
  const rows =
    data.rows.length === 0
      ? "<tr><td colspan=5 style='text-align:center;color:#888'>nessuno</td></tr>"
      : data.rows
          .map(
            (r) =>
              `<tr><td>${escapeHtml(r.name)}</td>` +
              `<td style="text-align:right">${hours(r.totalSeconds)}h</td>` +
              `<td style="text-align:right">${r.entryCount}</td>` +
              `<td style="text-align:right">${r.completedTasks}</td>` +
              `<td style="text-align:right">${r.billableAmount > 0 ? `${r.billableAmount.toFixed(2)} ${escapeHtml(r.currency)}` : "—"}</td></tr>`,
          )
          .join("");

  const billableTotalLine =
    data.billableByCurrency.size > 0
      ? `<p>Fatturabile: <strong>${Array.from(data.billableByCurrency.entries())
          .map(([cur, amt]) => `${amt.toFixed(2)} ${escapeHtml(cur)}`)
          .join(" · ")}</strong></p>`
      : "";

  return `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; max-width: 700px; margin: 0 auto;">
<h2>Report settimanale — ${escapeHtml(data.rangeLabel)}</h2>
<p>Ore totali: <strong>${hours(data.totalSeconds)}h</strong> · Task completati: <strong>${data.completedTasks}</strong></p>
${billableTotalLine}
<h3>Per cliente</h3>
<table style="width:100%; border-collapse:collapse;" cellpadding="6">
  <thead><tr style="border-bottom:1px solid #ccc">
    <th align="left">Cliente</th>
    <th align="right">Ore</th>
    <th align="right">Voci</th>
    <th align="right">Task</th>
    <th align="right">Fatturabile</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
