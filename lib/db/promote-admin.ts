import "dotenv/config";

import { eq } from "drizzle-orm";

import { db, schema } from "./index";

function parseArgs(argv: string[]) {
  let email: string | undefined;
  let revoke = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg === "--revoke") {
      revoke = true;
      continue;
    }
    if (arg === "--email") {
      email = argv[i + 1];
      i++;
      continue;
    }
    if (!arg.startsWith("-") && !email) {
      email = arg;
    }
  }

  return { email, revoke };
}

async function main() {
  const { email, revoke } = parseArgs(process.argv);

  if (!email?.trim()) {
    console.error("Usage: pnpm admin:promote <email>");
    console.error("       pnpm admin:promote --email <email> [--revoke]");
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userRow = await db.query.user.findFirst({
    where: eq(schema.user.email, normalizedEmail),
  });

  if (!userRow) {
    console.error(`User not found: ${normalizedEmail}`);
    process.exit(1);
  }

  const nextRole = revoke ? "user" : "admin";

  await db
    .update(schema.user)
    .set({ role: nextRole, updatedAt: new Date() })
    .where(eq(schema.user.id, userRow.id));

  console.log(
    revoke
      ? `Revoked platform admin for ${normalizedEmail} (role=user)`
      : `Promoted ${normalizedEmail} to platform admin (role=admin)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
