import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth/workspace";
import {
  findInvitationByToken,
  isInvitationExpired,
} from "@/lib/domain/project-members";
import { AcceptProjectInvitationForm } from "@/components/features/projects/members/accept-invitation-form";

type Params = { token: string };

export default async function AcceptProjectInvitationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const invitation = await findInvitationByToken(token);

  if (!invitation) {
    return (
      <Shell title="Invito non trovato">
        <p className="text-sm text-muted-foreground">
          Il link non è valido o l&apos;invito è stato annullato.
        </p>
      </Shell>
    );
  }

  if (invitation.status === "accepted") {
    redirect(`/projects/${invitation.projectId}`);
  }

  if (invitation.status !== "pending" || isInvitationExpired(invitation)) {
    // Best-effort: marca come expired per le prossime visite
    if (invitation.status === "pending") {
      await db
        .update(schema.projectInvitation)
        .set({ status: "expired" })
        .where(eq(schema.projectInvitation.id, invitation.id));
    }
    return (
      <Shell title="Invito scaduto">
        <p className="text-sm text-muted-foreground">
          Questo invito è scaduto. Chiedi a chi te lo ha mandato di rispedirlo.
        </p>
      </Shell>
    );
  }

  const [project, inviter] = await Promise.all([
    db.query.project.findFirst({ where: eq(schema.project.id, invitation.projectId) }),
    db.query.user.findFirst({ where: eq(schema.user.id, invitation.inviterId) }),
  ]);

  if (!project) {
    return (
      <Shell title="Project non disponibile">
        <p className="text-sm text-muted-foreground">
          Il project a cui sei stato invitato non esiste più.
        </p>
      </Shell>
    );
  }

  const session = await getSession();
  const inviterName = inviter?.name ?? inviter?.email ?? "Qualcuno";

  if (!session?.user) {
    const signInUrl = `/sign-in?redirectTo=${encodeURIComponent(`/invitations/project/${token}`)}&email=${encodeURIComponent(invitation.email)}`;
    return (
      <Shell title={`${inviterName} ti ha invitato`}>
        <p className="text-sm text-muted-foreground">
          Sei stato invitato a collaborare al project <strong>{project.name}</strong> come{" "}
          <strong>{invitation.role}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">
          Accedi con <strong>{invitation.email}</strong> per accettare. Se non hai un account
          verrà creato automaticamente.
        </p>
        <Link
          href={signInUrl}
          className="inline-flex w-fit items-center rounded-md bg-foreground px-4 py-2 font-mono text-[0.6875em] uppercase tracking-wider text-background hover:opacity-90"
        >
          Accedi per accettare
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
        <p className="text-sm text-muted-foreground">
          Esci e accedi con l&apos;email corretta, oppure chiedi a {inviterName} di inviare un nuovo
          invito a {session.user.email}.
        </p>
        <Link
          href="/today"
          className="inline-flex w-fit items-center rounded-md border border-input bg-background px-4 py-2 font-mono text-[0.6875em] uppercase tracking-wider hover:bg-card"
        >
          Vai alla home
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title={`${inviterName} ti ha invitato`}>
      <p className="text-sm text-muted-foreground">
        Sei stato invitato a collaborare al project <strong>{project.name}</strong> come{" "}
        <strong>{invitation.role}</strong>.
      </p>
      <AcceptProjectInvitationForm token={token} projectName={project.name} />
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
