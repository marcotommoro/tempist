"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  startTimerFromClientAction,
  startTimerFromProjectAction,
  type RunningTimerInfo,
} from "@/lib/actions/timer";

import { TimerConflictDialog } from "./timer-conflict-dialog";

/**
 * Pulsante "play" per avviare un timer al volo su un progetto o un cliente.
 * Riusa il pattern del play sui task; se un timer è già in corso apre il
 * TimerConflictDialog (scarta / salva / sposta). Feedback via toast.
 *
 * `stopPropagation` serve quando il bottone è dentro a un elemento cliccabile
 * (riga-link di lista, item della command palette): il play non deve navigare.
 */
export function QuickStartButton({
  target,
  className,
}: {
  target: { kind: "project" | "client"; id: string; label: string };
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [conflict, setConflict] = useState<RunningTimerInfo | null>(null);

  function start() {
    startTransition(async () => {
      const res =
        target.kind === "client"
          ? await startTimerFromClientAction(target.id)
          : await startTimerFromProjectAction(target.id);
      if (res.ok) {
        toast.success(`Timer avviato su ${target.label}`);
        return;
      }
      if (res.conflict) {
        setConflict(res.existing);
        return;
      }
      toast.error(res.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          start();
        }}
        disabled={pending}
        aria-label={`Avvia timer su ${target.label}`}
        title="Avvia timer"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sage/15 hover:text-sage disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          className,
        )}
      >
        <Play className="size-3.5" />
      </button>
      {conflict ? (
        <TimerConflictDialog
          open={!!conflict}
          onOpenChange={(o) => {
            if (!o) setConflict(null);
          }}
          existing={conflict}
          target={target}
        />
      ) : null}
    </>
  );
}
