/**
 * Canoni annui dei progetti + storico incassi.
 *
 * Un canone = importo + prossima scadenza sul progetto. "Segna pagato" registra l'incasso
 * e sposta la scadenza di un anno; il promemoria si ricava dallo stato (nessun job).
 */

import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { addOneYear } from "@/lib/utils/annual-fee";

export type FeeScheduleItem = {
  projectId: string;
  projectName: string;
  projectColor: string;
  clientName: string | null;
  amount: string;
  nextDueOn: string;
};

export type FeePaymentItem = {
  id: string;
  projectId: string;
  projectName: string;
  amount: string;
  dueOn: string;
  paidAt: Date;
};

function projectWhere(organizationId: string, projectId: string) {
  return and(
    eq(schema.project.id, projectId),
    eq(schema.project.organizationId, organizationId),
    isNull(schema.project.deletedAt),
  );
}

export async function setProjectAnnualFee(opts: {
  organizationId: string;
  projectId: string;
  amount: string | null;
  nextDueOn: string | null;
}): Promise<void> {
  // Canone valido solo con entrambi i campi: altrimenti lo togliamo del tutto.
  const clear = opts.amount === null || opts.nextDueOn === null;
  await db
    .update(schema.project)
    .set({
      annualFeeAmount: clear ? null : opts.amount,
      annualFeeNextDueOn: clear ? null : opts.nextDueOn,
    })
    .where(projectWhere(opts.organizationId, opts.projectId));
}

/** Registra l'incasso della scadenza corrente e sposta il rinnovo all'anno successivo. */
export async function markFeePaid(opts: {
  organizationId: string;
  projectId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [p] = await tx
      .select({
        amount: schema.project.annualFeeAmount,
        nextDueOn: schema.project.annualFeeNextDueOn,
      })
      .from(schema.project)
      .where(projectWhere(opts.organizationId, opts.projectId))
      .for("update");
    if (!p?.amount || !p.nextDueOn) throw new Error("Il progetto non ha un canone annuo");

    await tx.insert(schema.projectFeePayment).values({
      organizationId: opts.organizationId,
      projectId: opts.projectId,
      dueOn: p.nextDueOn,
      amount: p.amount,
    });
    await tx
      .update(schema.project)
      .set({ annualFeeNextDueOn: addOneYear(p.nextDueOn) })
      .where(projectWhere(opts.organizationId, opts.projectId));
  });
}

/** Annulla l'ultimo incasso del progetto (click sbagliato): la scadenza torna quella pagata. */
export async function undoLastFeePayment(opts: {
  organizationId: string;
  projectId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [last] = await tx
      .select({ id: schema.projectFeePayment.id, dueOn: schema.projectFeePayment.dueOn })
      .from(schema.projectFeePayment)
      .where(
        and(
          eq(schema.projectFeePayment.projectId, opts.projectId),
          eq(schema.projectFeePayment.organizationId, opts.organizationId),
        ),
      )
      .orderBy(desc(schema.projectFeePayment.paidAt))
      .limit(1);
    if (!last) throw new Error("Nessun pagamento da annullare");

    await tx.delete(schema.projectFeePayment).where(eq(schema.projectFeePayment.id, last.id));
    await tx
      .update(schema.project)
      .set({ annualFeeNextDueOn: last.dueOn })
      .where(projectWhere(opts.organizationId, opts.projectId));
  });
}

/** Progetti attivi con canone, ordinati per prossima scadenza. */
export async function listFeeSchedule(opts: {
  organizationId: string;
}): Promise<FeeScheduleItem[]> {
  const rows = await db
    .select({
      projectId: schema.project.id,
      projectName: schema.project.name,
      projectColor: schema.project.color,
      clientName: schema.client.name,
      amount: schema.project.annualFeeAmount,
      nextDueOn: schema.project.annualFeeNextDueOn,
    })
    .from(schema.project)
    .leftJoin(schema.client, eq(schema.client.id, schema.project.clientId))
    .where(
      and(
        eq(schema.project.organizationId, opts.organizationId),
        isNull(schema.project.deletedAt),
        isNull(schema.project.archivedAt),
        isNotNull(schema.project.annualFeeAmount),
        isNotNull(schema.project.annualFeeNextDueOn),
      ),
    )
    .orderBy(asc(schema.project.annualFeeNextDueOn));
  // I filtri isNotNull garantiscono i due campi; il cast li restringe per TypeScript.
  return rows as FeeScheduleItem[];
}

export async function listFeePayments(opts: {
  organizationId: string;
  limit?: number;
}): Promise<FeePaymentItem[]> {
  return db
    .select({
      id: schema.projectFeePayment.id,
      projectId: schema.projectFeePayment.projectId,
      projectName: schema.project.name,
      amount: schema.projectFeePayment.amount,
      dueOn: schema.projectFeePayment.dueOn,
      paidAt: schema.projectFeePayment.paidAt,
    })
    .from(schema.projectFeePayment)
    .innerJoin(schema.project, eq(schema.project.id, schema.projectFeePayment.projectId))
    .where(eq(schema.projectFeePayment.organizationId, opts.organizationId))
    .orderBy(desc(schema.projectFeePayment.paidAt))
    .limit(opts.limit ?? 50);
}
