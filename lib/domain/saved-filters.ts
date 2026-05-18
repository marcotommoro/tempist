/**
 * Saved Filters CRUD.
 * Ogni filter ha un proprietario (userId) + e' scoped a una org.
 */

import { and, asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Filter } from "@/lib/db/schema";

export async function listSavedFilters(opts: {
  organizationId: string;
  userId: string;
}): Promise<Filter[]> {
  return db.query.filter.findMany({
    where: and(
      eq(schema.filter.organizationId, opts.organizationId),
      eq(schema.filter.userId, opts.userId),
    ),
    orderBy: [asc(schema.filter.name)],
  });
}

export async function getSavedFilter(opts: {
  filterId: string;
  organizationId: string;
  userId: string;
}): Promise<Filter | null> {
  const f = await db.query.filter.findFirst({
    where: and(
      eq(schema.filter.id, opts.filterId),
      eq(schema.filter.organizationId, opts.organizationId),
      eq(schema.filter.userId, opts.userId),
    ),
  });
  return f ?? null;
}

export async function createSavedFilter(opts: {
  organizationId: string;
  userId: string;
  name: string;
  queryDsl: string;
}): Promise<Filter> {
  const [created] = await db
    .insert(schema.filter)
    .values({
      organizationId: opts.organizationId,
      userId: opts.userId,
      name: opts.name,
      queryDsl: opts.queryDsl,
    })
    .returning();
  if (!created) throw new Error("Insert filter fallito");
  return created;
}

export async function deleteSavedFilter(opts: {
  filterId: string;
  organizationId: string;
  userId: string;
}): Promise<void> {
  await db
    .delete(schema.filter)
    .where(
      and(
        eq(schema.filter.id, opts.filterId),
        eq(schema.filter.organizationId, opts.organizationId),
        eq(schema.filter.userId, opts.userId),
      ),
    );
}
