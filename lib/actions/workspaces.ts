"use server";

/**
 * Server Actions per workspace (organization) management.
 *
 * Le mutation strutturali delegano a `auth.api.*` (Better Auth) così sessione,
 * cookie e cache interna restano sincronizzati. La nostra business logic vive
 * nei guard pre-azione (es. canDeleteWorkspace).
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { z } from "zod";

import { auth } from "@/lib/auth/config";
import { requireActiveOrganization, requireSession } from "@/lib/auth/workspace";
import { canDeleteWorkspace } from "@/lib/domain/workspaces";
import type { ActionResult } from "./tasks";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function revalidateShell() {
  // La sidebar (con switcher) sta nel layout — revalidate radice
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Create / switch / update / delete
// ---------------------------------------------------------------------------

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Nome richiesto").max(60),
});

export async function createWorkspaceAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; slug: string | null }>> {
  try {
    await requireSession();
    const parsed = createWorkspaceSchema.safeParse({ name: formData.get("name") });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Input non valido" };
    }
    const base = slugify(parsed.data.name) || "workspace";
    // Suffix nanoid → evita collision senza chiamate extra di check
    const slug = `${base}-${nanoid(6).toLowerCase()}`;

    const org = await auth.api.createOrganization({
      headers: await headers(),
      body: {
        name: parsed.data.name,
        slug,
        keepCurrentActiveOrganization: false,
      },
    });
    if (!org) return { ok: false, error: "Errore nella creazione del workspace" };

    revalidateShell();
    return { ok: true, data: { id: org.id, slug: org.slug ?? null } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function switchWorkspaceAction(organizationId: string): Promise<ActionResult> {
  try {
    await requireSession();
    await auth.api.setActiveOrganization({
      headers: await headers(),
      body: { organizationId },
    });
    revalidateShell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/u, "Slug solo a-z, 0-9, -")
    .optional(),
  logo: z.string().trim().url().or(z.literal("")).optional(),
});

export async function updateWorkspaceAction(formData: FormData): Promise<ActionResult> {
  try {
    const { organizationId, role } = await requireActiveOrganization();
    if (role !== "owner" && role !== "admin") {
      return { ok: false, error: "Solo owner/admin possono modificare il workspace" };
    }
    const parsed = updateWorkspaceSchema.safeParse({
      name: formData.get("name") || undefined,
      slug: formData.get("slug") || undefined,
      logo: formData.get("logo") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Input non valido" };
    }
    await auth.api.updateOrganization({
      headers: await headers(),
      body: {
        organizationId,
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
          ...(parsed.data.logo ? { logo: parsed.data.logo } : {}),
        },
      },
    });
    revalidateShell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function deleteWorkspaceAction(organizationId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const eligible = await canDeleteWorkspace(session.user.id);
    if (!eligible) {
      return {
        ok: false,
        error: "Non puoi eliminare il tuo unico workspace. Creane un altro prima.",
      };
    }
    await auth.api.deleteOrganization({
      headers: await headers(),
      body: { organizationId },
    });
    revalidateShell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function leaveWorkspaceAction(organizationId: string): Promise<ActionResult> {
  try {
    await requireSession();
    await auth.api.leaveOrganization({
      headers: await headers(),
      body: { organizationId },
    });
    revalidateShell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

// ---------------------------------------------------------------------------
// Membri & inviti workspace
// ---------------------------------------------------------------------------

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email non valida"),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function inviteWorkspaceMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const { role: myRole } = await requireActiveOrganization();
    if (myRole !== "owner" && myRole !== "admin") {
      return { ok: false, error: "Solo owner/admin possono invitare" };
    }
    const parsed = inviteSchema.safeParse({
      email: formData.get("email"),
      role: formData.get("role") || "member",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Input non valido" };
    }
    await auth.api.createInvitation({
      headers: await headers(),
      body: {
        email: parsed.data.email,
        role: parsed.data.role,
        resend: true,
      },
    });
    revalidateShell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function cancelWorkspaceInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  try {
    const { role } = await requireActiveOrganization();
    if (role !== "owner" && role !== "admin") {
      return { ok: false, error: "Non autorizzato" };
    }
    await auth.api.cancelInvitation({
      headers: await headers(),
      body: { invitationId },
    });
    revalidateShell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function removeWorkspaceMemberAction(memberIdOrEmail: string): Promise<ActionResult> {
  try {
    const { role } = await requireActiveOrganization();
    if (role !== "owner" && role !== "admin") {
      return { ok: false, error: "Non autorizzato" };
    }
    await auth.api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail },
    });
    revalidateShell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

export async function updateWorkspaceMemberRoleAction(
  memberId: string,
  role: "owner" | "admin" | "member",
): Promise<ActionResult> {
  try {
    const { role: myRole } = await requireActiveOrganization();
    if (myRole !== "owner" && myRole !== "admin") {
      return { ok: false, error: "Non autorizzato" };
    }
    await auth.api.updateMemberRole({
      headers: await headers(),
      body: { memberId, role },
    });
    revalidateShell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}

// Esposta per la pagina pubblica /invitations/workspace/[id]
export async function acceptWorkspaceInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  try {
    await requireSession();
    await auth.api.acceptInvitation({
      headers: await headers(),
      body: { invitationId },
    });
    revalidateShell();
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore" };
  }
}
