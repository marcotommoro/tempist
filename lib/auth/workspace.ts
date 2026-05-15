/**
 * Server-side workspace helpers.
 *
 * Pattern uso in Server Components / Route Handlers / Server Actions:
 *
 *   import { requireSession, requireActiveOrganization } from "@/lib/auth/workspace";
 *   const { user } = await requireSession();
 *   const { organizationId, role } = await requireActiveOrganization();
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { auth } from "./config";
import { db, schema } from "@/lib/db";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }
  return session;
}

/**
 * Ritorna l'active organization dell'utente. Se non e' settata in sessione,
 * prende la prima organization di cui l'utente e' membro.
 * Se l'utente non ha alcuna org (caso edge: hook post-signup fallito), redirect a /sign-in.
 */
export async function requireActiveOrganization() {
  const session = await requireSession();
  const userId = session.user.id;

  let activeOrgId = session.session.activeOrganizationId ?? null;

  if (!activeOrgId) {
    const firstMembership = await db.query.member.findFirst({
      where: eq(schema.member.userId, userId),
    });
    if (!firstMembership) {
      console.error("[workspace] User has no organization membership", userId);
      redirect("/sign-in");
    }
    activeOrgId = firstMembership.organizationId;
  }

  const membership = await db.query.member.findFirst({
    where: and(eq(schema.member.userId, userId), eq(schema.member.organizationId, activeOrgId)),
  });

  if (!membership) {
    redirect("/sign-in");
  }

  return {
    user: session.user,
    organizationId: activeOrgId,
    role: membership.role as "owner" | "admin" | "member",
  };
}

/**
 * Guard per route che richiedono un ruolo specifico.
 */
export async function requireMemberRole(allowed: Array<"owner" | "admin" | "member">) {
  const ctx = await requireActiveOrganization();
  if (!allowed.includes(ctx.role)) {
    redirect("/today");
  }
  return ctx;
}
