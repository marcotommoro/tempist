import { describe, it, expect } from "vitest";

import {
  renderWeeklyReportText,
  renderWeeklyReportHtml,
  type WeeklyReportData,
} from "@/lib/utils/weekly-report-render";

const baseData: WeeklyReportData = {
  rangeLabel: "11 mag – 17 mag 2026",
  rows: [
    {
      name: "ACME",
      currency: "EUR",
      totalSeconds: 3600 * 5,
      billableAmount: 250,
      entryCount: 3,
      completedTasks: 2,
    },
    {
      name: "Contoso",
      currency: "USD",
      totalSeconds: 3600 * 2.5,
      billableAmount: 0,
      entryCount: 2,
      completedTasks: 0,
    },
  ],
  totalSeconds: 3600 * 7.5,
  completedTasks: 2,
  billableByCurrency: new Map([["EUR", 250]]),
};

describe("renderWeeklyReportText", () => {
  it("includes range label, totals, per-client lines", () => {
    const txt = renderWeeklyReportText(baseData);
    expect(txt).toContain("Report settimanale — 11 mag – 17 mag 2026");
    expect(txt).toContain("Ore totali: 7.50h");
    expect(txt).toContain("Task completati: 2");
    expect(txt).toContain("Fatturabile: 250.00 EUR");
    expect(txt).toContain("ACME: 5.00h · 3 voci · 2 task · 250.00 EUR");
    expect(txt).toContain("Contoso: 2.50h · 2 voci · 0 task");
    expect(txt).not.toMatch(/Contoso.*USD/); // no billable col if amount = 0
  });

  it("shows '(nessuno)' when rows empty", () => {
    const txt = renderWeeklyReportText({
      ...baseData,
      rows: [],
      totalSeconds: 0,
      completedTasks: 0,
      billableByCurrency: new Map(),
    });
    expect(txt).toMatch(/Per cliente:\s*\n\s*\(nessuno\)/);
  });
});

describe("renderWeeklyReportHtml", () => {
  it("renders table with all rows", () => {
    const html = renderWeeklyReportHtml(baseData);
    expect(html).toContain("Report settimanale");
    expect(html).toContain("ACME");
    expect(html).toContain("Contoso");
    expect(html).toContain("5.00h");
  });

  it("escapes HTML in client names", () => {
    const html = renderWeeklyReportHtml({
      ...baseData,
      rows: [
        {
          name: "<script>alert(1)</script>",
          currency: "EUR",
          totalSeconds: 0,
          billableAmount: 0,
          entryCount: 0,
          completedTasks: 0,
        },
      ],
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});
