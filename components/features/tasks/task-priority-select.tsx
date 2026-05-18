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

const PRIORITY_LIST: Array<{
  value: Task["priority"];
  label: string;
  color: string;
  dot: string;
}> = [
  { value: "P1", label: "P1  ·  Urgent", color: "text-p1", dot: "bg-p1" },
  { value: "P2", label: "P2  ·  High", color: "text-p2", dot: "bg-p2" },
  { value: "P3", label: "P3  ·  Medium", color: "text-p3", dot: "bg-p3" },
  { value: "P4", label: "P4  ·  Low", color: "text-muted-foreground", dot: "bg-muted-foreground/30" },
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
  const current =
    PRIORITY_LIST.find((p) => p.value === currentPriority) ?? PRIORITY_LIST[3]!;

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
          className="inline-flex h-9 w-full items-center gap-2.5 rounded-md border border-input bg-background px-3 text-[13px] transition-colors hover:border-foreground/20 hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <Flag className={cn("size-3.5", current.color)} />
          <span className="font-mono tracking-wider">{current.value}</span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Change
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <ul className="space-y-0.5">
          {PRIORITY_LIST.map((p) => (
            <li key={p.value}>
              <button
                type="button"
                onClick={() => apply(p.value)}
                disabled={pending}
                className={cn(
                  "inline-flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent disabled:opacity-50",
                  p.value === currentPriority && "bg-accent",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", p.dot)} aria-hidden />
                {p.label}
              </button>
            </li>
          ))}
        </ul>
        {error && (
          <p className="px-2 pt-2 font-mono text-[11px] text-destructive">
            {error}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
