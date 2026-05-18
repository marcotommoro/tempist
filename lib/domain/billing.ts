/**
 * Billing rate resolver — cascade gerarchico.
 *
 * Ordine di lookup:
 *   1. TASK-scoped rate per taskId
 *   2. PROJECT-scoped rate per projectId
 *   3. CLIENT-scoped rate per clientId  → fallback: client.hourlyRateDefault
 *   4. USER-scoped rate per userId
 *   5. null
 *
 * Per ogni scope si prende la rate piu' recente con effective_from <= `at`.
 * La currency segue la rate vincente (oppure quella del cliente, oppure default EUR).
 */

import { and, desc, eq, lte } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { getClient } from "./clients";

export type ResolveRateInput = {
  organizationId: string;
  taskId?: string | null;
  projectId?: string | null;
  clientId?: string | null;
  userId?: string | null;
  at?: Date;
};

export type ResolvedRate = {
  rate: string | null;
  currency: string;
  source: "TASK" | "PROJECT" | "CLIENT" | "CLIENT_DEFAULT" | "USER" | "NONE";
};

const DEFAULT_CURRENCY = "EUR";

async function lookupRate(
  organizationId: string,
  scope: "TASK" | "PROJECT" | "CLIENT" | "USER",
  scopeId: string,
  at: Date,
) {
  return db.query.billingRate.findFirst({
    where: and(
      eq(schema.billingRate.organizationId, organizationId),
      eq(schema.billingRate.scope, scope),
      eq(schema.billingRate.scopeId, scopeId),
      lte(schema.billingRate.effectiveFrom, at),
    ),
    orderBy: [desc(schema.billingRate.effectiveFrom)],
  });
}

export async function resolveRate(input: ResolveRateInput): Promise<ResolvedRate> {
  const at = input.at ?? new Date();

  if (input.taskId) {
    const r = await lookupRate(input.organizationId, "TASK", input.taskId, at);
    if (r) return { rate: r.value, currency: r.currency, source: "TASK" };
  }
  if (input.projectId) {
    const r = await lookupRate(input.organizationId, "PROJECT", input.projectId, at);
    if (r) return { rate: r.value, currency: r.currency, source: "PROJECT" };
  }
  if (input.clientId) {
    const r = await lookupRate(input.organizationId, "CLIENT", input.clientId, at);
    if (r) return { rate: r.value, currency: r.currency, source: "CLIENT" };
    // Fallback: client.hourlyRateDefault (no BillingRate row)
    const client = await getClient({
      clientId: input.clientId,
      organizationId: input.organizationId,
    });
    if (client?.hourlyRateDefault) {
      return {
        rate: client.hourlyRateDefault,
        currency: client.currency,
        source: "CLIENT_DEFAULT",
      };
    }
  }
  if (input.userId) {
    const r = await lookupRate(input.organizationId, "USER", input.userId, at);
    if (r) return { rate: r.value, currency: r.currency, source: "USER" };
  }
  return { rate: null, currency: DEFAULT_CURRENCY, source: "NONE" };
}

/**
 * Crea una nuova BillingRate (immutabile: per "modificare" si crea una riga
 * con effective_from piu' recente — preserva storia).
 */
export async function createBillingRate(input: {
  organizationId: string;
  scope: "TASK" | "PROJECT" | "CLIENT" | "USER";
  scopeId: string | null;
  value: string;
  currency: string;
  effectiveFrom?: Date;
}) {
  const [created] = await db
    .insert(schema.billingRate)
    .values({
      organizationId: input.organizationId,
      scope: input.scope,
      scopeId: input.scopeId,
      value: input.value,
      currency: input.currency,
      effectiveFrom: input.effectiveFrom ?? new Date(),
    })
    .returning();
  if (!created) throw new Error("Insert billing_rate fallito");
  return created;
}
