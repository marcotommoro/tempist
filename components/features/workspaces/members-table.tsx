"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import {
  removeWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction,
} from "@/lib/actions/workspaces";
import type { WorkspaceMember, WorkspaceRole } from "@/lib/domain/workspaces";

export function MembersTable({
  members,
  currentUserId,
  canManage,
}: {
  members: WorkspaceMember[];
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onRoleChange(memberId: string, role: WorkspaceRole) {
    startTransition(async () => {
      const res = await updateWorkspaceMemberRoleAction(memberId, role);
      if (res.ok) router.refresh();
    });
  }

  function onRemove(memberId: string) {
    if (!confirm("Rimuovere questo membro dal workspace?")) return;
    startTransition(async () => {
      const res = await removeWorkspaceMemberAction(memberId);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      {members.length === 0 ? (
        <p className="px-3 py-3 font-display text-sm italic text-muted-foreground">
          Nessun membro.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {members.map((m) => {
            const isMe = m.userId === currentUserId;
            return (
              <li key={m.memberId} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground/10 font-mono text-[0.625rem] uppercase tracking-wider text-foreground"
                >
                  {(m.name ?? m.email).slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {m.name ?? m.email}
                    {isMe && (
                      <span className="ml-1.5 font-mono text-[0.5625rem] uppercase tracking-wider text-muted-foreground">
                        (tu)
                      </span>
                    )}
                  </p>
                  {m.name && (
                    <p className="truncate font-mono text-[0.625rem] text-muted-foreground">
                      {m.email}
                    </p>
                  )}
                </div>
                {canManage && !isMe ? (
                  <select
                    value={m.role}
                    onChange={(e) => onRoleChange(m.memberId, e.target.value as WorkspaceRole)}
                    disabled={pending}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                ) : (
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
                    {m.role}
                  </span>
                )}
                {canManage && !isMe && (
                  <button
                    type="button"
                    onClick={() => onRemove(m.memberId)}
                    disabled={pending}
                    aria-label={`Rimuovi ${m.email}`}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
