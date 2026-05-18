"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { setTaskPriorityAction } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db/schema";

const PRIORITY_LIST: Array<{ value: Task["priority"]; label: string; color: string }> = [
  { value: "P1", label: "P1 — Urgente", color: "text-red-500" },
  { value: "P2", label: "P2 — Alta", color: "text-orange-500" },
  { value: "P3", label: "P3 — Media", color: "text-blue-500" },
  { value: "P4", label: "P4 — Bassa", color: "text-muted-foreground" },
];

export function TaskPrioritySelect({
  taskId,
  currentPriority,
}: {
  taskId: string;
  currentPriority: Task["priority"];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = PRIORITY_LIST.find((p) => p.value === currentPriority) ?? PRIORITY_LIST[3]!;

  function apply(next: Task["priority"]) {
    setError(null);
    startTransition(async () => {
      const res = await setTaskPriorityAction(taskId, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          <Flag className={cn("size-4", current.color)} />
          <span>{current.value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <ul className="space-y-0.5">
          {PRIORITY_LIST.map((p) => (
            <li key={p.value}>
              <button
                type="button"
                onClick={() => apply(p.value)}
                disabled={pending}
                className={cn(
                  "w-full inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs text-left hover:bg-muted disabled:opacity-50",
                  p.value === currentPriority && "bg-muted",
                )}
              >
                <Flag className={cn("size-3.5", p.color)} />
                {p.label}
              </button>
            </li>
          ))}
        </ul>
        {error && <p className="px-2 pt-2 text-xs text-destructive">{error}</p>}
      </PopoverContent>
    </Popover>
  );
}
