import "dotenv/config";
import { db, schema } from "../lib/db";

async function main() {
  const users = await db.select({ id: schema.user.id, email: schema.user.email, name: schema.user.name }).from(schema.user);
  console.log("Users:");
  for (const u of users) console.log(`  ${u.email}  (${u.id})  ${u.name ?? ""}`);

  const tasksByOrg = await db.execute<{ organization_id: string; n: number }>(
    "select organization_id, count(*)::int as n from \"task\" where deleted_at is null group by organization_id order by n desc",
  );
  console.log("\nLive tasks per organization:");
  for (const row of tasksByOrg.rows ?? tasksByOrg) {
    console.log(`  ${row.organization_id}: ${row.n}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
