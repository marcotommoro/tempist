"use client";

import { parseISO } from "date-fns";
import { Plus } from "lucide-react";

import { CreateTaskDialog } from "@/components/features/tasks/create-task-dialog";

/**
 * Bottone "Aggiungi attività" per un giorno della vista Attività.
 *
 * Wrapper client: il trigger viene creato DENTRO il boundary client invece di
 * passare un ReactNode dal server component. In dev (Turbopack, Next 16) i
 * CreateTaskDialog ripetuti come sibling nel tree RSC con trigger serializzato
 * venivano SSR-ati solo in parte → hydration mismatch. In produzione il
 * problema non si presenta, ma questo wrapper tiene pulito anche il dev.
 */
export function AddTaskForDay({
  dayKey,
  timezone,
}: {
  /** Giorno locale "yyyy-MM-dd". */
  dayKey: string;
  timezone?: string;
}) {
  // Default creazione: giorno alle 09:00 locali.
  const dayAt9 = parseISO(dayKey);
  dayAt9.setHours(9, 0, 0, 0);

  return (
    <CreateTaskDialog
      defaultScheduledAt={dayAt9}
      timezone={timezone}
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[0.625em] uppercase tracking-wider text-muted-foreground transition-colors hover:text-coral"
        >
          <Plus className="size-3" /> Aggiungi attività
        </button>
      }
    />
  );
}
