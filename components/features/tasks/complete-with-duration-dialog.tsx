"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CompleteDecision =
  | { type: "confirm"; minutes: number }
  | { type: "skip" };

export function CompleteWithDurationDialog({
  open,
  onOpenChange,
  taskTitle,
  defaultMinutes,
  pending,
  onDecision,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskTitle: string;
  defaultMinutes: number;
  pending: boolean;
  onDecision: (d: CompleteDecision) => void;
}) {
  const [minutes, setMinutes] = useState<string>(String(defaultMinutes));

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    const n = Number.parseInt(minutes, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    onDecision({ type: "confirm", minutes: n });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setMinutes(String(defaultMinutes));
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quanto ci hai messo?</DialogTitle>
          <DialogDescription>
            Stai completando <span className="font-medium text-foreground">{taskTitle}</span>.
            La stima era {defaultMinutes}m. Registra il tempo reale come time entry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duration-minutes">Minuti effettivi</Label>
            <Input
              id="duration-minutes"
              type="number"
              min={1}
              max={24 * 60}
              step={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              autoFocus
              disabled={pending}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDecision({ type: "skip" })}
              disabled={pending}
            >
              Salta
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : "Conferma e completa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
