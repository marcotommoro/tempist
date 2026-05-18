"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  archiveClient,
  createClient,
  softDeleteClient,
  updateClient,
} from "@/lib/domain/clients";
import type { ActionResult } from "./tasks";

function revalidateClients(clientId?: string) {
  revalidatePath("/clients");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/", "layout");
}

const createClientSchema = z.object({
  name: z.string().trim().min(1, "Nome richiesto").max(120),
  email: z.string().trim().email("Email non valida").optional().or(z.literal("")),
  vatNumber: z.string().trim().max(40).optional().or(z.literal("")),
  currency: z.string().trim().length(3).optional(),
  hourlyRateDefault: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/u, "Tariffa: numero con max 2 decimali")
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/u, "Colore deve essere hex #RRGGBB")
    .optional(),
});

export async function createClientAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const parsed = createClientSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email") ?? "",
      vatNumber: formData.get("vatNumber") ?? "",
      currency: formData.get("currency") ?? "EUR",
      hourlyRateDefault: formData.get("hourlyRateDefault") ?? "",
      color: formData.get("color") ?? "#3b82f6",
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }
    const cl = await createClient({
      organizationId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      vatNumber: parsed.data.vatNumber || null,
      currency: parsed.data.currency ?? "EUR",
      hourlyRateDefault: parsed.data.hourlyRateDefault || null,
      color: parsed.data.color,
    });
    revalidateClients(cl.id);
    return { ok: true, data: { id: cl.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

const updateClientSchema = createClientSchema.partial();

export async function updateClientAction(
  clientId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    const raw = {
      name: formData.get("name") ?? undefined,
      email: formData.get("email") ?? undefined,
      vatNumber: formData.get("vatNumber") ?? undefined,
      currency: formData.get("currency") ?? undefined,
      hourlyRateDefault: formData.get("hourlyRateDefault") ?? undefined,
      color: formData.get("color") ?? undefined,
    };
    const parsed = updateClientSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Input non valido" };
    }
    const patch: Record<string, string | null> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.email !== undefined) patch.email = parsed.data.email || null;
    if (parsed.data.vatNumber !== undefined)
      patch.vatNumber = parsed.data.vatNumber || null;
    if (parsed.data.currency !== undefined) patch.currency = parsed.data.currency;
    if (parsed.data.hourlyRateDefault !== undefined)
      patch.hourlyRateDefault = parsed.data.hourlyRateDefault || null;
    if (parsed.data.color !== undefined) patch.color = parsed.data.color;

    await updateClient({ clientId, organizationId, patch });
    revalidateClients(clientId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function archiveClientAction(clientId: string): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    await archiveClient({ clientId, organizationId });
    revalidateClients();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  try {
    const { organizationId } = await requireActiveOrganization();
    await softDeleteClient({ clientId, organizationId });
    revalidateClients();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
