import {
  createTestOrgAndUser,
  migrateTestDb,
} from "./helpers/db";

import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createClient } from "@/lib/domain/clients";
import { createProject, setProjectClient } from "@/lib/domain/projects";
import { createTask, getTasksForClient } from "@/lib/domain/tasks";
import {
  createManualEntry,
  getClientAggregates,
  getProjectAggregatesForClient,
  listTimeEntriesForClient,
  startTimerFromTask,
  stopTimer,
} from "@/lib/domain/time-entries";

let organizationId: string;
let userId: string;

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  const main = await createTestOrgAndUser();
  organizationId = main.organizationId;
  userId = main.userId;
});

async function seedAssociatedProject() {
  const client = await createClient({ organizationId, name: "Acme" });
  const project = await createProject({
    organizationId,
    name: "Sito Acme",
  });
  const task = await createTask({
    organizationId,
    createdById: userId,
    title: "Homepage",
    projectId: project.id,
  });
  await setProjectClient({
    projectId: project.id,
    organizationId,
    clientId: client.id,
  });
  return { client, project, task };
}

describe("client roll-up via project association", () => {
  it("include i task del progetto associato anche senza task.clientId", async () => {
    const { client, task } = await seedAssociatedProject();
    const tasks = await getTasksForClient({
      organizationId,
      clientId: client.id,
      includeCompleted: true,
    });
    expect(tasks.map((t) => t.id)).toContain(task.id);
  });

  it("include le ore storiche del progetto anche con time_entry.clientId null", async () => {
    const { client, project } = await seedAssociatedProject();
    const startedAt = new Date("2026-03-01T09:00:00Z");
    const endedAt = new Date("2026-03-01T11:00:00Z");
    await createManualEntry({
      organizationId,
      userId,
      startedAt,
      endedAt,
      description: "Lavoro prima dell'associazione",
      projectId: project.id,
      clientId: null,
    });

    const entries = await listTimeEntriesForClient({
      organizationId,
      clientId: client.id,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.durationSeconds).toBe(7200);

    const aggregates = await getProjectAggregatesForClient({
      organizationId,
      clientId: client.id,
    });
    expect(aggregates).toEqual([
      expect.objectContaining({
        projectId: project.id,
        totalSeconds: 7200,
        entryCount: 1,
      }),
    ]);
  });

  it("attribuisce gli aggregati report al cliente del progetto, non a un clientId diretto diverso", async () => {
    const acme = await createClient({ organizationId, name: "Acme" });
    const globex = await createClient({ organizationId, name: "Globex" });
    const project = await createProject({
      organizationId,
      name: "Sito Acme",
      clientId: acme.id,
    });
    await createManualEntry({
      organizationId,
      userId,
      startedAt: new Date("2026-03-01T09:00:00Z"),
      endedAt: new Date("2026-03-01T10:00:00Z"),
      projectId: project.id,
      clientId: globex.id,
    });

    const aggregates = await getClientAggregates({ organizationId });
    expect(aggregates.get(acme.id)?.totalSeconds).toBe(3600);
    expect(aggregates.get(globex.id)).toBeUndefined();
  });

  it("eredita il cliente del progetto quando si avvia il timer da un task", async () => {
    const { client, task } = await seedAssociatedProject();
    expect(task.clientId).toBeNull();

    const started = await startTimerFromTask({
      organizationId,
      userId,
      task,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.entry.clientId).toBe(client.id);

    await stopTimer({ userId, organizationId });
  });
});
