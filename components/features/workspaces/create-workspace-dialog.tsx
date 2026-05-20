"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createWorkspaceAction, switchWorkspaceAction } from "@/lib/actions/workspaces";

export function CreateWorkspaceDialog({
  trigger,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", trimmed);
      const res = await createWorkspaceAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Switch attivo + refresh sidebar
      const sw = await switchWorkspaceAction(res.data.id);
      if (!sw.ok) {
        setError(sw.error);
        return;
      }
      setName("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={currentOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crea workspace</DialogTitle>
          <DialogDescription>
            Un workspace separa project, task e team. Verrai impostato come owner.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
              Nome
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              autoFocus
              maxLength={60}
              placeholder="Acme, Lavori cliente, Personale…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </label>
          {error && <p className="font-mono text-[0.6875rem] text-destructive">{error}</p>}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-md border border-input bg-background px-3 py-2 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 font-mono text-[0.6875rem] uppercase tracking-wider text-background hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              {pending ? "Creazione…" : "Crea"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
