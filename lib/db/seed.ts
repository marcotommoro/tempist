/**
 * Database seed (Drizzle).
 *
 * Esecuzione:
 *   pnpm db:seed
 *
 * Crea dati demo idempotenti:
 *   - 1 user demo
 *   - 1 organization "Personal"
 *   - 1 client demo "Acme Inc."
 *   - 3 task demo
 *
 * Note: questo seed *non* gestisce ancora la creazione di sessioni Better Auth
 * o credenziali OAuth — l'utente accede via magic link normalmente (lo stesso
 * user_id verrà riconosciuto).
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, schema } from "./index";

const DEMO_EMAIL = "demo@todoist.local";

async function main() {
  // ---- User ----
  const existingUser = await db.query.user.findFirst({
    where: eq(schema.user.email, DEMO_EMAIL),
  });
  const [userRow] = existingUser
    ? [existingUser]
    : await db
        .insert(schema.user)
        .values({
          email: DEMO_EMAIL,
          name: "Demo User",
          emailVerified: true,
        })
        .returning();

  if (!userRow) throw new Error("Impossibile creare user demo");

  // ---- Organization (Workspace personale) ----
  const existingMember = await db.query.member.findFirst({
    where: eq(schema.member.userId, userRow.id),
  });
  let orgId: string;
  if (existingMember) {
    orgId = existingMember.organizationId;
  } else {
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "Personal",
        slug: `personal-${userRow.id.slice(0, 8)}`,
      })
      .returning();
    if (!org) throw new Error("Impossibile creare organization demo");
    orgId = org.id;
    await db.insert(schema.member).values({
      organizationId: orgId,
      userId: userRow.id,
      role: "owner",
    });
  }

  // ---- Client demo ----
  const existingClient = await db.query.client.findFirst({
    where: eq(schema.client.organizationId, orgId),
  });
  const [clientRow] = existingClient
    ? [existingClient]
    : await db
        .insert(schema.client)
        .values({
          organizationId: orgId,
          name: "Acme Inc.",
          email: "billing@acme.example",
          currency: "EUR",
          hourlyRateDefault: "80.00",
          color: "#3b82f6",
        })
        .returning();

  if (!clientRow) throw new Error("Impossibile creare client demo");

  // ---- Task demo ----
  const taskTitles = [
    "Setup repository e schema iniziale",
    "Disegnare Quick Add NLP parser",
    "Demo: tracciare 30 minuti su Acme",
  ];
  const existingTasks = await db.query.task.findMany({
    where: eq(schema.task.organizationId, orgId),
  });
  const existingTitles = new Set(existingTasks.map((t) => t.title));
  const newTasks = taskTitles.filter((t) => !existingTitles.has(t));
  if (newTasks.length > 0) {
    await db.insert(schema.task).values(
      newTasks.map((title) => ({
        organizationId: orgId,
        createdById: userRow.id,
        clientId: clientRow.id,
        title,
        priority: "P3" as const,
      })),
    );
  }

  console.log("Seed completato:", {
    userId: userRow.id,
    organizationId: orgId,
    clientId: clientRow.id,
    tasksCreated: newTasks.length,
    tasksAlreadyPresent: existingTitles.size,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
