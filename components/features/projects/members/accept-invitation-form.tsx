"use client";

import { useState, useTransition } from "react";

import { acceptProjectInvitationAction } from "@/lib/actions/projects";

export function AcceptProjectInvitationForm({
  token,
  projectName,
}: {
  token: string;
  projectName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptProjectInvitationAction(token);
      if (res && !res.ok) setError(res.error);
      // Action redirect on success → unreachable
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onAccept}
        disabled={pending}
        className="inline-flex w-fit items-center rounded-md bg-foreground px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-background hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Accettazione…" : `Accetta e apri "${projectName}"`}
      </button>
      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
