import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth/workspace";
import { isWorkspaceInvitationExpired } from "@/lib/domain/workspaces";
import { AcceptWorkspaceInvitationForm } from "@/components/features/workspaces/accept-workspace-form";

type Params = { id: string };

export default async function AcceptWorkspaceInvitationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;

  const invitation = await db.query.invitation.findFirst({
    where: eq(schema.invitation.id, id),
  });

  if (!invitation) {
    return (
      <Shell title="Invito non trovato">
        <p className="text-sm text-muted-foreground">
          Il link non è valido o l&apos;invito è stato annullato.
        </p>
      </Shell>
    );
  }

  if (invitation.status !== "pending") {
    return (
      <Shell title="Invito già processato">
        <p className="text-sm text-muted-foreground">
          Questo invito è già stato {invitation.status}.
        </p>
      </Shell>
    );
  }

  if (isWorkspaceInvitationExpired(invitation.expiresAt)) {
    return (
      <Shell title="Invito scaduto">
        <p className="text-sm text-muted-foreground">
          Chiedi a chi te lo ha mandato di rispedirlo.
        </p>
      </Shell>
    );
  }

  const [org, inviter] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(schema.organization.id, invitation.organizationId),
    }),
    db.query.user.findFirst({ where: eq(schema.user.id, invitation.inviterId) }),
  ]);

  if (!org) {
    return (
      <Shell title="Workspace non disponibile">
        <p className="text-sm text-muted-foreground">
          Il workspace a cui sei stato invitato non esiste più.
        </p>
      </Shell>
    );
  }

  const session = await getSession();
  const inviterName = inviter?.name ?? inviter?.email ?? "Qualcuno";

  if (!session?.user) {
    const signInUrl = `/sign-in?redirectTo=${encodeURIComponent(`/invitations/workspace/${id}`)}&email=${encodeURIComponent(invitation.email)}`;
    return (
      <Shell title={`${inviterName} ti ha invitato`}>
        <p className="text-sm text-muted-foreground">
          Sei stato invitato al workspace <strong>{org.name}</strong> come{" "}
          <strong>{invitation.role}</strong>.
        </p>
        <Link
          href={signInUrl}
          className="inline-flex w-fit items-center rounded-md bg-foreground px-4 py-2 font-mono text-[0.6875em] uppercase tracking-wider text-background hover:opacity-90"
        >
          Accedi con {invitation.email}
        </Link>
      </Shell>
    );
  }

  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <Shell title="Email diversa">
        <p className="text-sm text-muted-foreground">
          Sei loggato come <strong>{session.user.email}</strong> ma l&apos;invito è per{" "}
          <strong>{invitation.email}</strong>.
        </p>
      </Shell>
    );
  }

  // Se l'utente sta già nel workspace per qualche motivo, redirect
  const existing = await db.query.member.findFirst({
    where: eq(schema.member.userId, session.user.id),
  });
  if (existing && existing.organizationId === invitation.organizationId) {
    redirect("/today");
  }

  return (
    <Shell title={`${inviterName} ti ha invitato`}>
      <p className="text-sm text-muted-foreground">
        Sei stato invitato al workspace <strong>{org.name}</strong> come{" "}
        <strong>{invitation.role}</strong>.
      </p>
      <AcceptWorkspaceInvitationForm invitationId={id} workspaceName={org.name} />
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6">
      <div className="w-full space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-2xl text-foreground">{title}</h1>
        {children}
      </div>
    </main>
  );
}
