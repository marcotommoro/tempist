"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { acceptWorkspaceInvitationAction } from "@/lib/actions/workspaces";

export function AcceptWorkspaceInvitationForm({
  invitationId,
  workspaceName,
}: {
  invitationId: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptWorkspaceInvitationAction(invitationId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/today");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onAccept}
        disabled={pending}
        className="inline-flex w-fit items-center rounded-md bg-foreground px-4 py-2 font-mono text-[0.6875em] uppercase tracking-wider text-background hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Accettazione…" : `Entra in "${workspaceName}"`}
      </button>
      {error && <p className="font-mono text-[0.6875em] text-destructive">{error}</p>}
    </div>
  );
}
