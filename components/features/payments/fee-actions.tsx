"use client";

import { useState, useTransition } from "react";
import { Check, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { markFeePaidAction, undoLastFeePaymentAction } from "@/lib/actions/project-fees";
import type { ActionResult } from "@/lib/actions/tasks";

function useFeeAction(run: () => Promise<ActionResult>) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const trigger = () => {
    setError(null);
    startTransition(async () => {
      const res = await run();
      if (!res.ok) setError(res.error);
    });
  };
  return { pending, error, trigger };
}

export function MarkFeePaidButton({ projectId }: { projectId: string }) {
  const { pending, error, trigger } = useFeeAction(() => markFeePaidAction(projectId));
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-[0.75em] text-destructive">{error}</span>}
      <Button size="sm" variant="outline" onClick={trigger} disabled={pending}>
        <Check />
        {pending ? "Salvo…" : "Segna pagato"}
      </Button>
    </span>
  );
}

export function UndoFeePaymentButton({ projectId }: { projectId: string }) {
  const { pending, error, trigger } = useFeeAction(() => undoLastFeePaymentAction(projectId));
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-[0.75em] text-destructive">{error}</span>}
      <Button size="sm" variant="subtle" onClick={trigger} disabled={pending}>
        <Undo2 />
        Annulla
      </Button>
    </span>
  );
}
