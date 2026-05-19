"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import type { ProjectInvitation } from "@/lib/db/schema";
import type { ProjectMemberWithUser } from "@/lib/domain/project-members";
import { ProjectMembersDialog } from "./project-members-dialog";

export function ProjectMembersButton({
  projectId,
  projectName,
  members,
  invitations,
  canManage,
  currentUserId,
}: {
  projectId: string;
  projectName: string;
  members: ProjectMemberWithUser[];
  invitations: ProjectInvitation[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);

  const count = members.length;
  const avatars = members.slice(0, 3);
  const extra = Math.max(0, count - avatars.length);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-2 py-1 transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Gestisci membri del project"
      >
        {count > 0 ? (
          <span className="flex -space-x-1.5">
            {avatars.map((m) => (
              <span
                key={m.id}
                aria-hidden
                className="grid h-5 w-5 place-items-center rounded-full bg-foreground/10 font-mono text-[9px] uppercase text-foreground ring-2 ring-card"
              >
                {(m.name ?? m.email).slice(0, 1)}
              </span>
            ))}
            {extra > 0 && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-muted font-mono text-[9px] text-muted-foreground ring-2 ring-card">
                +{extra}
              </span>
            )}
          </span>
        ) : (
          <Users className="size-3.5 text-muted-foreground" />
        )}
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {count === 0 ? "Invita" : count === 1 ? "1 esterno" : `${count} esterni`}
        </span>
      </button>
      <ProjectMembersDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        projectName={projectName}
        members={members}
        invitations={invitations}
        canManage={canManage}
        currentUserId={currentUserId}
      />
    </>
  );
}
