"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteWorkspaceAction } from "@/lib/actions/workspaces";

export function DeleteWorkspaceDialog({
  workspaceId,
  workspaceName,
  trigger,
}: {
  workspaceId: string;
  workspaceName: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canDelete = confirm === workspaceName;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canDelete) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteWorkspaceAction(workspaceId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setConfirm("");
      router.replace("/today");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-[0.6875em] uppercase tracking-wider text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
            Elimina workspace
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Elimina workspace
          </DialogTitle>
          <DialogDescription>
            Questa azione è irreversibile. Tutti i project, le task, i tempi e i client del
            workspace <strong>{workspaceName}</strong> verranno eliminati definitivamente. Per
            confermare, digita il nome del workspace qui sotto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={pending}
            placeholder={workspaceName}
            autoComplete="off"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive disabled:opacity-50"
          />
          {error && <p className="font-mono text-[0.6875em] text-destructive">{error}</p>}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-md border border-input bg-background px-3 py-2 font-mono text-[0.6875em] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={pending || !canDelete}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-2 font-mono text-[0.6875em] uppercase tracking-wider text-destructive-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              {pending ? "Eliminazione…" : "Elimina per sempre"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
