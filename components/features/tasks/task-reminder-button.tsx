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

const RELATIVE_PRESETS = [
  { value: "-10m", label: "10 min prima" },
  { value: "-1h", label: "1 ora prima" },
  { value: "-1d", label: "1 giorno prima" },
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
          className="relative text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
        >
          <Bell className="size-4" />
          {reminderCount > 0 && (
            <span className="absolute -top-1 -right-1 size-3 inline-flex items-center justify-center rounded-full bg-blue-500 text-[8px] font-semibold text-white tabular-nums">
              {reminderCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Promemoria attivi
            </div>
            {reminders === null ? (
              <div className="text-xs text-muted-foreground">Caricamento…</div>
            ) : reminders.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nessuno.</div>
            ) : (
              <ul className="space-y-1">
                {reminders.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className={r.sentAt ? "text-muted-foreground line-through" : ""}>
                      {r.triggerType === "RELATIVE"
                        ? formatRelativeOffset(r.triggerValue)
                        : new Date(r.triggerValue).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => del(r.id)}
                      disabled={pending}
                      aria-label="Rimuovi"
                      className="text-muted-foreground hover:text-destructive disabled:cursor-not-allowed"
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
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Preset (relativi a scheduledAt)
              </div>
              <div className="flex flex-wrap gap-1">
                {RELATIVE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => addPreset(p.value)}
                    disabled={pending}
                    className="text-xs px-2 py-1 rounded border bg-card hover:bg-muted disabled:cursor-not-allowed"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Data/ora specifica
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                disabled={pending}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="sm"
                onClick={addCustom}
                disabled={pending || !customDateTime}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
