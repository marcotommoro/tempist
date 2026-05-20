"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  cancelProjectInvitationAction,
  inviteToProjectAction,
  removeProjectMemberAction,
  updateProjectMemberRoleAction,
} from "@/lib/actions/projects";
import type {
  ProjectMemberWithUser,
  ProjectRole,
} from "@/lib/domain/project-members";
import type { ProjectInvitation } from "@/lib/db/schema";

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(d);
}

export function ProjectMembersDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  members,
  invitations,
  canManage,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  members: ProjectMemberWithUser[];
  invitations: ProjectInvitation[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("editor");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function onInvite(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", trimmed);
      fd.set("role", role);
      const res = await inviteToProjectAction(projectId, fd);
      if (!res.ok) {
        setFeedback({ kind: "err", text: res.error });
        return;
      }
      setEmail("");
      setFeedback({
        kind: "ok",
        text:
          res.data.kind === "direct"
            ? `Aggiunto ${trimmed} al project (già membro del workspace)`
            : `Invito inviato a ${trimmed}`,
      });
      router.refresh();
    });
  }

  function onRoleChange(userId: string, nextRole: ProjectRole) {
    startTransition(async () => {
      const res = await updateProjectMemberRoleAction(projectId, userId, nextRole);
      if (res.ok) router.refresh();
    });
  }

  function onRemoveMember(userId: string) {
    if (!confirm("Rimuovere questa persona dal project?")) return;
    startTransition(async () => {
      const res = await removeProjectMemberAction(projectId, userId);
      if (res.ok) router.refresh();
    });
  }

  function onCancelInvite(invitationId: string) {
    startTransition(async () => {
      const res = await cancelProjectInvitationAction(projectId, invitationId);
      if (res.ok) router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Membri del project</DialogTitle>
          <DialogDescription>
            <strong>{projectName}</strong> — workspace member hanno accesso completo; i project
            member sono esterni che vedono solo questo project.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Membri ({members.length})</TabsTrigger>
            <TabsTrigger value="invites">In sospeso ({invitations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-3 pt-3">
            {canManage && (
              <form
                onSubmit={onInvite}
                className="space-y-2 rounded-md border border-border bg-card/40 p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={pending}
                    placeholder="email@dominio.com"
                    autoComplete="off"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as ProjectRole)}
                    disabled={pending}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs disabled:opacity-50"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="submit"
                    disabled={pending || !email.trim()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-background hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="size-3" />
                    Invita
                  </button>
                </div>
                {feedback && (
                  <p
                    className={
                      feedback.kind === "ok"
                        ? "font-mono text-[0.625rem] text-coral"
                        : "font-mono text-[0.625rem] text-destructive"
                    }
                  >
                    {feedback.text}
                  </p>
                )}
              </form>
            )}

            <div className="overflow-hidden rounded-md border border-border">
              {members.length === 0 ? (
                <p className="px-3 py-3 font-display text-sm italic text-muted-foreground">
                  Nessun membro esterno al workspace.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {members.map((m) => {
                    const isMe = m.userId === currentUserId;
                    return (
                      <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                        <span
                          aria-hidden
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground/10 font-mono text-[0.625rem] uppercase text-foreground"
                        >
                          {(m.name ?? m.email).slice(0, 2)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">
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
                            onChange={(e) =>
                              onRoleChange(m.userId, e.target.value as ProjectRole)
                            }
                            disabled={pending}
                            className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
                            {m.role}
                          </span>
                        )}
                        {canManage && !isMe && (
                          <button
                            type="button"
                            onClick={() => onRemoveMember(m.userId)}
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
          </TabsContent>

          <TabsContent value="invites" className="pt-3">
            {invitations.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-card/40 px-3 py-3 text-center font-display text-sm italic text-muted-foreground">
                Nessun invito in sospeso.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {invitations.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{i.email}</p>
                      <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {i.role} · scade {fmtDate(i.expiresAt)}
                      </p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => onCancelInvite(i.id)}
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
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
