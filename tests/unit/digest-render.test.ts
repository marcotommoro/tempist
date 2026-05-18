import { describe, it, expect } from "vitest";

import {
  renderDigestText,
  renderDigestHtml,
  type DigestData,
} from "@/lib/utils/digest-render";
import type { Task } from "@/lib/db/schema";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t_1",
    organizationId: "org_1",
    projectId: null,
    sectionId: null,
    parentId: null,
    clientId: null,
    assigneeId: null,
    title: "Task uno",
    descriptionMarkdown: null,
    priority: "P2",
    scheduledAt: new Date("2026-05-20T10:00:00Z"),
    dueDate: null,
    estimatedMinutes: null,
    recurrenceRule: null,
    completedAt: null,
    deletedAt: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "u_1",
    ...overrides,
  };
}

describe("renderDigestText", () => {
  it("includes date, count of tasks/reminders, tracked hours", () => {
    const data: DigestData = {
      date: "lunedì 20 maggio",
      tasksToday: [makeTask({ title: "Email cliente" })],
      remindersDue: [{ taskTitle: "Chiamata", triggerAt: new Date("2026-05-20T15:00:00Z") }],
      yesterdayTrackedSeconds: 3600 + 1800,
    };
    const txt = renderDigestText(data);
    expect(txt).toContain("Digest — lunedì 20 maggio");
    expect(txt).toContain("Task di oggi (1)");
    expect(txt).toContain("[P2] Email cliente");
    expect(txt).toContain("Promemoria oggi (1)");
    expect(txt).toContain("Chiamata");
    expect(txt).toContain("1.50h");
  });

  it("shows '(nessuno)' when lists empty", () => {
    const txt = renderDigestText({
      date: "x",
      tasksToday: [],
      remindersDue: [],
      yesterdayTrackedSeconds: 0,
    });
    expect(txt).toMatch(/Task di oggi \(0\):\s*\n\s*\(nessuno\)/);
    expect(txt).toMatch(/Promemoria oggi \(0\):\s*\n\s*\(nessuno\)/);
  });
});

describe("renderDigestHtml", () => {
  it("escapes HTML in titles", () => {
    const html = renderDigestHtml({
      date: "x",
      tasksToday: [makeTask({ title: "<script>alert(1)</script>" })],
      remindersDue: [],
      yesterdayTrackedSeconds: 0,
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});
