/**
 * Client domain — anagrafica clienti del workspace.
 *
 * Soft delete via deletedAt; archive via status=ARCHIVED (operazioni distinte:
 * archive = "non lo uso più ma esiste storico", delete = "cancellato per errore").
 */

import { and, asc, eq, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Client } from "@/lib/db/schema";

export async function listClients(opts: {
  organizationId: string;
  includeArchived?: boolean;
}): Promise<Client[]> {
  const conds = [
    eq(schema.client.organizationId, opts.organizationId),
    isNull(schema.client.deletedAt),
  ];
  if (!opts.includeArchived) {
    conds.push(eq(schema.client.status, "ACTIVE"));
  }
  return db.query.client.findMany({
    where: and(...conds),
    orderBy: [asc(schema.client.name)],
  });
}

export async function getClient(opts: {
  clientId: string;
  organizationId: string;
}): Promise<Client | null> {
  const c = await db.query.client.findFirst({
    where: and(
      eq(schema.client.id, opts.clientId),
      eq(schema.client.organizationId, opts.organizationId),
      isNull(schema.client.deletedAt),
    ),
  });
  return c ?? null;
}

export type CreateClientInput = {
  organizationId: string;
  name: string;
  email?: string | null;
  vatNumber?: string | null;
  address?: string | null;
  currency?: string;
  hourlyRateDefault?: string | null;
  color?: string;
  notes?: string | null;
};

export async function createClient(input: CreateClientInput): Promise<Client> {
  const [created] = await db
    .insert(schema.client)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      email: input.email ?? null,
      vatNumber: input.vatNumber ?? null,
      address: input.address ?? null,
      currency: input.currency ?? "EUR",
      hourlyRateDefault: input.hourlyRateDefault ?? null,
      color: input.color ?? "#3b82f6",
      notes: input.notes ?? null,
    })
    .returning();
  if (!created) throw new Error("Insert client fallito");
  return created;
}

export type UpdateClientInput = {
  clientId: string;
  organizationId: string;
  patch: Partial<{
    name: string;
    email: string | null;
    vatNumber: string | null;
    address: string | null;
    currency: string;
    hourlyRateDefault: string | null;
    color: string;
    notes: string | null;
  }>;
};

export async function updateClient(input: UpdateClientInput): Promise<void> {
  await db
    .update(schema.client)
    .set(input.patch)
    .where(
      and(
        eq(schema.client.id, input.clientId),
        eq(schema.client.organizationId, input.organizationId),
      ),
    );
}

export async function archiveClient(opts: {
  clientId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .update(schema.client)
    .set({ status: "ARCHIVED" })
    .where(
      and(
        eq(schema.client.id, opts.clientId),
        eq(schema.client.organizationId, opts.organizationId),
      ),
    );
}

export async function softDeleteClient(opts: {
  clientId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .update(schema.client)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(schema.client.id, opts.clientId),
        eq(schema.client.organizationId, opts.organizationId),
      ),
    );
}
