"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  markFeePaid,
  setProjectAnnualFee,
  undoLastFeePayment,
} from "@/lib/domain/project-fees";
import type { ActionResult } from "./tasks";

function revalidateFees(projectId: string) {
  revalidatePath("/payments");
  revalidatePath("/tasks");
  revalidatePath(`/projects/${projectId}`);
}

const feeSchema = z.object({
  projectId: z.string().min(1),
  // Valore di <input type="number">: punto decimale, già normalizzato dal browser.
  amount: z
    .union([z.literal(""), z.string().regex(/^\d{1,10}(\.\d{1,2})?$/u, "Importo non valido")])
    .transform((v) => (v === "" ? null : v)),
  nextDueOn: z
    .union([z.literal(""), z.iso.date("Data non valida")])
    .transform((v) => (v === "" ? null : v)),
});

export async function setProjectAnnualFeeAction(input: {
  projectId: string;
  amount: string;
  nextDueOn: string;
}): Promise<ActionResult> {
  const { organizationId } = await requireActiveOrganization();
  const parsed = feeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const { projectId, amount, nextDueOn } = parsed.data;
  if ((amount === null) !== (nextDueOn === null)) {
    return { ok: false, error: "Servono sia importo sia data di rinnovo" };
  }
  try {
    await setProjectAnnualFee({ organizationId, projectId, amount, nextDueOn });
    revalidateFees(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function markFeePaidAction(projectId: string): Promise<ActionResult> {
  const { organizationId } = await requireActiveOrganization();
  try {
    await markFeePaid({ organizationId, projectId });
    revalidateFees(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function undoLastFeePaymentAction(projectId: string): Promise<ActionResult> {
  const { organizationId } = await requireActiveOrganization();
  try {
    await undoLastFeePayment({ organizationId, projectId });
    revalidateFees(projectId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
