"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  addReminderAction,
  deleteReminderAction,
  listRemindersAction,
} from "@/lib/actions/reminders";
import type { Reminder } from "@/lib/db/schema";
import { formatRelativeOffset } from "@/lib/utils/reminder-time";
import { cn } from "@/lib/utils";

const RELATIVE_PRESETS = [
  { value: "-10m", label: "10 min" },
  { value: "-1h", label: "1 h" },
  { value: "-1d", label: "1 d" },
];

export function TaskReminderButton({
  taskId,
  hasScheduledAt,
  reminderCount,
}: {
  taskId: string;
  hasScheduledAt: boolean;
  reminderCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customDateTime, setCustomDateTime] = useState("");

  useEffect(() => {
    if (open && reminders === null) {
      void listRemindersAction(taskId).then((rs) => setReminders(rs));
    }
  }, [open, reminders, taskId]);

  function addPreset(value: string) {
    setError(null);
    startTransition(async () => {
      const res = await addReminderAction({
        taskId,
        triggerType: "RELATIVE",
        triggerValue: value,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const updated = await listRemindersAction(taskId);
      setReminders(updated);
    });
  }

  function addCustom() {
    if (!customDateTime) return;
    setError(null);
    startTransition(async () => {
      const iso = new Date(customDateTime).toISOString();
      const res = await addReminderAction({
        taskId,
        triggerType: "TIME",
        triggerValue: iso,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCustomDateTime("");
      const updated = await listRemindersAction(taskId);
      setReminders(updated);
    });
  }

  function del(reminderId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteReminderAction({ reminderId, taskId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const updated = await listRemindersAction(taskId);
      setReminders(updated);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Gestisci promemoria"
          title="Promemoria"
          className={cn(
            "relative inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            reminderCount > 0 && "text-coral",
          )}
        >
          <Bell className="size-3.5" />
          {reminderCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-3 min-w-3 items-center justify-center rounded-full bg-coral px-1 font-mono text-[0.5em] font-medium tabular-nums text-coral-foreground">
              {reminderCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-3">
          <div>
            <div className="mb-2 font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
              Attivi
            </div>
            {reminders === null ? (
              <div className="font-display text-[0.75em] italic text-muted-foreground">
                Caricamento…
              </div>
            ) : reminders.length === 0 ? (
              <div className="font-display text-[0.75em] italic text-muted-foreground">
                Nessuno.
              </div>
            ) : (
              <ul className="space-y-1">
                {reminders.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between text-[0.75em]"
                  >
                    <span
                      className={cn(
                        r.sentAt && "text-muted-foreground line-through",
                      )}
                    >
                      {r.triggerType === "RELATIVE"
                        ? formatRelativeOffset(r.triggerValue)
                        : new Date(r.triggerValue).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => del(r.id)}
                      disabled={pending}
                      aria-label="Rimuovi"
                      className="text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasScheduledAt && (
            <div>
              <div className="mb-2 font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
                Preset · prima della data
              </div>
              <div className="flex flex-wrap gap-1">
                {RELATIVE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => addPreset(p.value)}
                    disabled={pending}
                    className="inline-flex h-7 items-center rounded border border-border bg-card/40 px-2 font-mono text-[0.6875em] tabular-nums transition-colors hover:bg-accent disabled:cursor-not-allowed"
                  >
                    −{p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 font-mono text-[0.625em] uppercase tracking-[0.16em] text-muted-foreground">
              Data/ora specifica
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                disabled={pending}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="icon-sm"
                onClick={addCustom}
                disabled={pending || !customDateTime}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>

          {error && (
            <p className="font-mono text-[0.6875em] text-destructive">{error}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
