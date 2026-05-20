/**
 * One-shot cleanup: soft-delete every task in Edoardo's workspaces
 * WITHOUT pushing deletes to Google Calendar.
 *
 * Sequence:
 *   1. Find user by USER_EMAIL.
 *   2. Find all organizations where they're a member.
 *   3. Drop calendarEventLink rows for tasks in those orgs (so the next
 *      calendar.sync tick does NOT call deleteEvent on Google).
 *   4. Soft-delete the tasks (set deletedAt where deletedAt IS NULL).
 *
 * Usage:
 *   tsx scripts/cleanup-tasks.ts           # dry-run, prints counts
 *   tsx scripts/cleanup-tasks.ts --apply   # actually mutates
 */

import "dotenv/config";
import { and, inArray, isNull } from "drizzle-orm";
import { db, schema } from "../lib/db";

const USER_EMAILS = (process.env.USER_EMAILS ?? "REDACTED@example.com,REDACTED@example.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const APPLY = process.argv.includes("--apply");

async function main() {
  const users = await db
    .select({ id: schema.user.id, email: schema.user.email })
    .from(schema.user)
    .where(inArray(schema.user.email, USER_EMAILS));

  if (users.length === 0) {
    console.error(`No users matched ${USER_EMAILS.join(", ")}`);
    process.exit(1);
  }
  console.log(`Matched users: ${users.map((u) => u.email).join(", ")}`);

  const memberships = await db
    .select({ organizationId: schema.member.organizationId })
    .from(schema.member)
    .where(inArray(schema.member.userId, users.map((u) => u.id)));

  const orgIds = [...new Set(memberships.map((m) => m.organizationId))];
  if (orgIds.length === 0) {
    console.log(`No workspaces for ${USER_EMAIL}.`);
    return;
  }

  const liveTasks = await db
    .select({ id: schema.task.id })
    .from(schema.task)
    .where(
      and(
        inArray(schema.task.organizationId, orgIds),
        isNull(schema.task.deletedAt),
      ),
    );
  const taskIds = liveTasks.map((t) => t.id);

  const links = taskIds.length
    ? await db
        .select({ id: schema.calendarEventLink.id })
        .from(schema.calendarEventLink)
        .where(inArray(schema.calendarEventLink.taskId, taskIds))
    : [];

  console.log(`Workspaces:     ${orgIds.length}  [${orgIds.join(", ")}]`);
  console.log(`Live tasks:     ${taskIds.length}`);
  console.log(`Calendar links: ${links.length}`);
  console.log(`Mode:           ${APPLY ? "APPLY" : "DRY-RUN"}`);

  if (!APPLY) {
    console.log("\nRe-run with --apply to perform the cleanup.");
    return;
  }
  if (taskIds.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.calendarEventLink)
      .where(inArray(schema.calendarEventLink.taskId, taskIds));

    const now = new Date();
    await tx
      .update(schema.task)
      .set({ deletedAt: now, updatedAt: now })
      .where(inArray(schema.task.id, taskIds));
  });

  console.log(`\nDone. Soft-deleted ${taskIds.length} tasks, removed ${links.length} calendar links.`);
  console.log("Google Calendar events were NOT touched.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
