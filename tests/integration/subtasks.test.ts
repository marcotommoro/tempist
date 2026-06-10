// NB: l'harness DEVE essere il primo import — fa l'override di DATABASE_URL
// nel suo prefisso sincrono, prima che @/lib/db crei il pool singleton.
import {
  createTestOrgAndUser,
  db,
  migrateTestDb,
  schema,
  truncateTasks,
} from "./helpers/db";

import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createSubtask,
  createTask,
  getInboxTasks,
  getSubtaskCountsByParent,
  listSubtasks,
  softDeleteTask,
  toggleTaskComplete,
} from "@/lib/domain/tasks";

let organizationId: string;
let userId: string;
let otherOrganizationId: string;
let otherUserId: string;

beforeAll(async () => {
  await migrateTestDb();
  const main = await createTestOrgAndUser();
  organizationId = main.organizationId;
  userId = main.userId;
  const other = await createTestOrgAndUser();
  otherOrganizationId = other.organizationId;
  otherUserId = other.userId;
});

beforeEach(async () => {
  await truncateTasks();
});

function makeParent(title = "Padre") {
  return createTask({ organizationId, createdById: userId, title });
}

function makeChild(parentId: string, title = "Figlio") {
  return createSubtask({ organizationId, createdById: userId, parentId, title });
}

describe("createSubtask", () => {
  it("crea un figlio senza progetto, cliente né data", async () => {
    const parent = await makeParent();
    const child = await makeChild(parent.id);

    expect(child.parentId).toBe(parent.id);
    expect(child.projectId).toBeNull();
    expect(child.clientId).toBeNull();
    expect(child.scheduledAt).toBeNull();
    expect(child.priority).toBe("P4");
    expect(child.organizationId).toBe(organizationId);
  });

  it("rifiuta una sottoattività di una sottoattività (1 solo livello)", async () => {
    const parent = await makeParent();
    const child = await makeChild(parent.id);

    await expect(makeChild(child.id, "Nipote")).rejects.toThrow(
      "Le sottoattività non possono avere altre sottoattività",
    );
  });

  it("rifiuta padre inesistente, cancellato o di altra org", async () => {
    await expect(makeChild("id-inesistente")).rejects.toThrow(
      "Attività padre non trovata",
    );

    const deleted = await makeParent("Cancellato");
    await softDeleteTask({ taskId: deleted.id, organizationId });
    await expect(makeChild(deleted.id)).rejects.toThrow(
      "Attività padre non trovata",
    );

    const foreign = await createTask({
      organizationId: otherOrganizationId,
      createdById: otherUserId,
      title: "Di altra org",
    });
    await expect(makeChild(foreign.id)).rejects.toThrow(
      "Attività padre non trovata",
    );
  });
});

describe("listSubtasks", () => {
  it("ritorna i figli vivi in ordine di creazione, filtrati per org", async () => {
    const parent = await makeParent();
    const first = await makeChild(parent.id, "Primo");
    const second = await makeChild(parent.id, "Secondo");
    const removed = await makeChild(parent.id, "Rimosso");
    await softDeleteTask({ taskId: removed.id, organizationId });

    const children = await listSubtasks({ parentId: parent.id, organizationId });
    expect(children.map((c) => c.id)).toEqual([first.id, second.id]);

    const crossOrg = await listSubtasks({
      parentId: parent.id,
      organizationId: otherOrganizationId,
    });
    expect(crossOrg).toEqual([]);
  });
});

describe("getInboxTasks", () => {
  it("esclude le sottoattività (vivono dentro il padre)", async () => {
    const parent = await makeParent();
    await makeChild(parent.id);

    const inbox = await getInboxTasks({ organizationId });
    expect(inbox.map((t) => t.id)).toEqual([parent.id]);
  });
});

describe("toggleTaskComplete con sottoattività", () => {
  it("completare il padre completa i figli aperti con lo stesso timestamp", async () => {
    const parent = await makeParent();
    const openA = await makeChild(parent.id, "Aperto A");
    const openB = await makeChild(parent.id, "Aperto B");
    const alreadyDone = await makeChild(parent.id, "Già fatto");
    const { task: doneBefore } = await toggleTaskComplete({
      taskId: alreadyDone.id,
      organizationId,
    });

    const { task: completedParent } = await toggleTaskComplete({
      taskId: parent.id,
      organizationId,
    });
    expect(completedParent.completedAt).not.toBeNull();

    const children = await listSubtasks({ parentId: parent.id, organizationId });
    const byId = new Map(children.map((c) => [c.id, c]));
    expect(byId.get(openA.id)?.completedAt?.getTime()).toBe(
      completedParent.completedAt?.getTime(),
    );
    expect(byId.get(openB.id)?.completedAt?.getTime()).toBe(
      completedParent.completedAt?.getTime(),
    );
    // Il figlio già completato mantiene il suo timestamp originale.
    expect(byId.get(alreadyDone.id)?.completedAt?.getTime()).toBe(
      doneBefore.completedAt?.getTime(),
    );
  });

  it("riaprire il padre non riapre i figli", async () => {
    const parent = await makeParent();
    const child = await makeChild(parent.id);

    await toggleTaskComplete({ taskId: parent.id, organizationId }); // completa
    await toggleTaskComplete({ taskId: parent.id, organizationId }); // riapre

    const children = await listSubtasks({ parentId: parent.id, organizationId });
    expect(children.find((c) => c.id === child.id)?.completedAt).not.toBeNull();
  });

  it("non tocca figli di altri task con lo stesso titolo", async () => {
    const parent = await makeParent();
    const sibling = await makeParent("Altro padre");
    const siblingChild = await makeChild(sibling.id, "Figlio altrui");

    await toggleTaskComplete({ taskId: parent.id, organizationId });

    const others = await listSubtasks({ parentId: sibling.id, organizationId });
    expect(others.find((c) => c.id === siblingChild.id)?.completedAt).toBeNull();
  });

  it("la ricorrenza non clona le sottoattività e non eredita parentId", async () => {
    const parent = await createTask({
      organizationId,
      createdById: userId,
      title: "Ricorrente",
      scheduledAt: new Date("2026-06-10T08:00:00Z"),
      recurrenceRule: "FREQ=DAILY",
    });
    await makeChild(parent.id);

    const { spawned } = await toggleTaskComplete({
      taskId: parent.id,
      organizationId,
    });
    expect(spawned).not.toBeNull();
    expect(spawned?.parentId).toBeNull();

    const spawnedChildren = await listSubtasks({
      parentId: spawned!.id,
      organizationId,
    });
    expect(spawnedChildren).toEqual([]);
  });
});

describe("softDeleteTask con sottoattività", () => {
  it("cancellare il padre soft-cancella anche i figli", async () => {
    const parent = await makeParent();
    await makeChild(parent.id, "Figlio 1");
    await makeChild(parent.id, "Figlio 2");

    await softDeleteTask({ taskId: parent.id, organizationId });

    expect(await listSubtasks({ parentId: parent.id, organizationId })).toEqual([]);
    const raw = await db.query.task.findMany({
      where: eq(schema.task.parentId, parent.id),
    });
    expect(raw).toHaveLength(2);
    expect(raw.every((t) => t.deletedAt !== null)).toBe(true);
  });
});

describe("getSubtaskCountsByParent", () => {
  it("conta totali e completati per padre, esclusi i cancellati", async () => {
    const p1 = await makeParent("Padre 1");
    const p2 = await makeParent("Padre 2");
    const done = await makeChild(p1.id, "Fatto");
    await makeChild(p1.id, "Aperto");
    const removed = await makeChild(p1.id, "Rimosso");
    await toggleTaskComplete({ taskId: done.id, organizationId });
    await softDeleteTask({ taskId: removed.id, organizationId });

    const counts = await getSubtaskCountsByParent({
      organizationId,
      taskIds: [p1.id, p2.id],
    });
    expect(counts.get(p1.id)).toEqual({ total: 2, completed: 1 });
    expect(counts.get(p2.id)).toBeUndefined();
  });

  it("ritorna mappa vuota senza taskIds", async () => {
    const counts = await getSubtaskCountsByParent({ organizationId, taskIds: [] });
    expect(counts.size).toBe(0);
  });
});
