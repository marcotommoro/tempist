import { describe, expect, it } from "vitest";

import {
  GoogleSyncTokenExpiredError,
  isAppOriginatedEvent,
  isGoogleEventInPast,
  mapGoogleEventToTaskFields,
  shouldImportGoogleEvent,
} from "@/lib/integrations/google-calendar";
import { resolveSyncWinner } from "@/lib/domain/calendar-conflict";
import type { CalendarEventLink, Task } from "@/lib/db/schema";

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task1",
    organizationId: "org1",
    projectId: null,
    sectionId: null,
    parentId: null,
    clientId: null,
    assigneeId: null,
    createdById: "user1",
    title: "Meet",
    descriptionMarkdown: null,
    priority: "P4",
    scheduledAt: new Date("2026-05-20T10:00:00Z"),
    dueDate: null,
    estimatedMinutes: 60,
    recurrenceRule: null,
    completedAt: null,
    deletedAt: null,
    order: 0,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: new Date("2026-05-20T09:00:00Z"),
    ...overrides,
  };
}

function baseLink(overrides: Partial<CalendarEventLink> = {}): CalendarEventLink {
  return {
    id: "link1",
    taskId: "task1",
    calendarAccountId: "acc1",
    externalEventId: "evt1",
    etag: "etag1",
    googleUpdatedAt: new Date("2026-05-20T08:00:00Z"),
    lastSyncedAt: new Date("2026-05-20T08:00:00Z"),
    ...overrides,
  };
}

describe("shouldImportGoogleEvent", () => {
  it("imports timed default events", () => {
    expect(
      shouldImportGoogleEvent({
        id: "1",
        etag: "e",
        start: { dateTime: "2026-05-20T10:00:00Z" },
        end: { dateTime: "2026-05-20T11:00:00Z" },
        eventType: "default",
      }),
    ).toBe(true);
  });

  it("skips all-day events", () => {
    expect(
      shouldImportGoogleEvent({
        id: "1",
        etag: "e",
        start: { date: "2026-05-20" },
        end: { date: "2026-05-21" },
      }),
    ).toBe(false);
  });

  it("skips app-originated events", () => {
    expect(
      shouldImportGoogleEvent({
        id: "1",
        etag: "e",
        start: { dateTime: "2026-05-20T10:00:00Z" },
        end: { dateTime: "2026-05-20T11:00:00Z" },
        extendedProperties: {
          private: { app: "todoist", taskId: "task1" },
        },
      }),
    ).toBe(false);
  });

  it("skips focusTime and birthday", () => {
    expect(
      shouldImportGoogleEvent({
        id: "1",
        etag: "e",
        start: { dateTime: "2026-05-20T10:00:00Z" },
        end: { dateTime: "2026-05-20T11:00:00Z" },
        eventType: "focusTime",
      }),
    ).toBe(false);
  });
});

describe("mapGoogleEventToTaskFields", () => {
  it("maps summary, schedule and duration", () => {
    const fields = mapGoogleEventToTaskFields({
      id: "1",
      etag: "e",
      summary: "Call",
      description: "Notes",
      start: { dateTime: "2026-05-20T10:00:00Z" },
      end: { dateTime: "2026-05-20T11:30:00Z" },
    });
    expect(fields).toEqual({
      title: "Call",
      descriptionMarkdown: "Notes",
      scheduledAt: new Date("2026-05-20T10:00:00Z"),
      estimatedMinutes: 90,
      completedAt: null,
    });
  });

  it("returns null for cancelled all-day", () => {
    expect(
      mapGoogleEventToTaskFields({
        id: "1",
        etag: "e",
        start: { date: "2026-05-20" },
        end: { date: "2026-05-21" },
        status: "cancelled",
      }),
    ).toBeNull();
  });
});

describe("isGoogleEventInPast", () => {
  const now = new Date("2026-05-20T12:00:00Z");

  it("flags event that ended before now", () => {
    expect(
      isGoogleEventInPast(
        {
          id: "1",
          etag: "e",
          start: { dateTime: "2026-05-19T10:00:00Z" },
          end: { dateTime: "2026-05-19T11:00:00Z" },
        },
        now,
      ),
    ).toBe(true);
  });

  it("keeps in-progress event (started before now, ends after)", () => {
    expect(
      isGoogleEventInPast(
        {
          id: "1",
          etag: "e",
          start: { dateTime: "2026-05-20T11:30:00Z" },
          end: { dateTime: "2026-05-20T13:00:00Z" },
        },
        now,
      ),
    ).toBe(false);
  });

  it("keeps future event", () => {
    expect(
      isGoogleEventInPast(
        {
          id: "1",
          etag: "e",
          start: { dateTime: "2026-05-21T09:00:00Z" },
          end: { dateTime: "2026-05-21T10:00:00Z" },
        },
        now,
      ),
    ).toBe(false);
  });

  it("falls back to start when end is missing", () => {
    expect(
      isGoogleEventInPast(
        {
          id: "1",
          etag: "e",
          start: { dateTime: "2026-05-19T10:00:00Z" },
          end: {},
        },
        now,
      ),
    ).toBe(true);
  });

  it("returns false when no usable timestamp (all-day events filtered elsewhere)", () => {
    expect(
      isGoogleEventInPast(
        {
          id: "1",
          etag: "e",
          start: { date: "2026-05-19" },
          end: { date: "2026-05-20" },
        },
        now,
      ),
    ).toBe(false);
  });
});

describe("isAppOriginatedEvent", () => {
  it("detects private app marker", () => {
    expect(
      isAppOriginatedEvent({
        id: "1",
        etag: "e",
        start: { dateTime: "2026-05-20T10:00:00Z" },
        end: { dateTime: "2026-05-20T11:00:00Z" },
        extendedProperties: { private: { app: "todoist" } },
      }),
    ).toBe(true);
  });
});

describe("resolveSyncWinner", () => {
  it("pull wins when only google changed", () => {
    const task = baseTask({ updatedAt: new Date("2026-05-20T08:00:00Z") });
    const link = baseLink({ lastSyncedAt: new Date("2026-05-20T08:00:00Z") });
    expect(
      resolveSyncWinner({
        task,
        link,
        googleUpdated: new Date("2026-05-20T10:00:00Z"),
      }),
    ).toBe("pull");
  });

  it("push wins when only task changed", () => {
    const task = baseTask({ updatedAt: new Date("2026-05-20T10:00:00Z") });
    const link = baseLink({
      lastSyncedAt: new Date("2026-05-20T08:00:00Z"),
      googleUpdatedAt: new Date("2026-05-20T08:00:00Z"),
    });
    expect(
      resolveSyncWinner({
        task,
        link,
        googleUpdated: new Date("2026-05-20T08:00:00Z"),
      }),
    ).toBe("push");
  });

  it("last-write-wins when both changed", () => {
    const task = baseTask({ updatedAt: new Date("2026-05-20T11:00:00Z") });
    const link = baseLink({ lastSyncedAt: new Date("2026-05-20T08:00:00Z") });
    expect(
      resolveSyncWinner({
        task,
        link,
        googleUpdated: new Date("2026-05-20T10:00:00Z"),
      }),
    ).toBe("push");
    expect(
      resolveSyncWinner({
        task: baseTask({ updatedAt: new Date("2026-05-20T09:00:00Z") }),
        link,
        googleUpdated: new Date("2026-05-20T11:00:00Z"),
      }),
    ).toBe("pull");
  });

  it("skips when nothing changed since last sync", () => {
    const t = new Date("2026-05-20T08:00:00Z");
    const task = baseTask({ updatedAt: t });
    const link = baseLink({
      lastSyncedAt: t,
      googleUpdatedAt: t,
    });
    expect(resolveSyncWinner({ task, link, googleUpdated: t })).toBe("skip");
  });
});

describe("GoogleSyncTokenExpiredError", () => {
  it("has stable name", () => {
    expect(new GoogleSyncTokenExpiredError().name).toBe(
      "GoogleSyncTokenExpiredError",
    );
  });
});
