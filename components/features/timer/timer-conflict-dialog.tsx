"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  resolveTimerConflictAction,
  type RunningTimerInfo,
} from "@/lib/actions/timer";

export type QuickStartTarget = {
  kind: "project" | "client" | "task";
  id: string;
  label: string;
};

/**
 * Dialog a tre vie mostrato quando si avvia un timer ma ce n'è già uno in corso.
 *   - Salva e avvia: ferma/salva il corrente, ne avvia uno nuovo sul target
 *   - Sposta: riassegna il timer corrente al target (tempo e descrizione invariati)
 *   - Scarta: elimina il corrente senza salvarlo, ne avvia uno nuovo
 */
export function TimerConflictDialog({
  open,
  onOpenChange,
  existing,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: RunningTimerInfo;
  target: QuickStartTarget;
}) {
  const [pending, startTransition] = useTransition();

  function resolve(resolution: "discard" | "save" | "merge") {
    startTransition(async () => {
      const res = await resolveTimerConflictAction({
        resolution,
        target: { kind: target.kind, id: target.id },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        resolution === "merge"
          ? `Timer spostato su ${target.label}`
          : resolution === "save"
            ? `Voce precedente salvata · timer avviato su ${target.label}`
            : `Voce precedente scartata · timer avviato su ${target.label}`,
      );
      onOpenChange(false);
    });
  }

  const desc = existing.description?.trim() || "(senza descrizione)";
  const startedLabel = format(new Date(existing.startedAt), "HH:mm");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hai già un timer attivo</DialogTitle>
          <DialogDescription>
            «{desc}», avviato alle {startedLabel}. Cosa vuoi fare prima di
            avviare il timer su «{target.label}»?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-1">
          <Button type="button" onClick={() => resolve("save")} disabled={pending}>
            Salva e avvia il nuovo
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => resolve("merge")}
            disabled={pending}
          >
            Sposta il timer attuale su «{target.label}»
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => resolve("discard")}
            disabled={pending}
            className="text-destructive hover:text-destructive"
          >
            Scarta il timer attuale e avvia il nuovo
          </Button>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Annulla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
