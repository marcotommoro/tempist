"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { cancelWorkspaceInvitationAction } from "@/lib/actions/workspaces";
import type { WorkspacePendingInvitation } from "@/lib/domain/workspaces";

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(d);
}

export function PendingInvitationsList({
  invitations,
  canManage,
}: {
  invitations: WorkspacePendingInvitation[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onCancel(invitationId: string) {
    startTransition(async () => {
      const res = await cancelWorkspaceInvitationAction(invitationId);
      if (res.ok) router.refresh();
    });
  }

  if (invitations.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-card/40 px-3 py-3 text-center font-display text-sm italic text-muted-foreground">
        Nessun invito in sospeso.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
      {invitations.map((i) => (
        <li key={i.id} className="flex items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{i.email}</p>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
              {i.role} · scade {fmtDate(i.expiresAt)}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => onCancel(i.id)}
              disabled={pending}
              aria-label={`Annulla invito a ${i.email}`}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
