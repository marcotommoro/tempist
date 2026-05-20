"use client";

import Link from "next/link";
import { addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Client } from "@/lib/db/schema";
import { weekSearchParams } from "@/lib/utils/timesheet-week";
import { cn } from "@/lib/utils";

export function TimesheetFilters({
  weekFrom,
  weekLabel,
  clients,
  clientId,
}: {
  weekFrom: Date;
  weekLabel: string;
  clients: Pick<Client, "id" | "name">[];
  clientId?: string;
}) {
  const prevFrom = subWeeks(weekFrom, 1);
  const nextFrom = addWeeks(weekFrom, 1);

  function hrefFor(from: Date, nextClientId?: string) {
    const q = weekSearchParams(from, nextClientId ?? clientId);
    return `/timesheet?${q}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card">
        <Link
          href={hrefFor(prevFrom)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-l-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Settimana precedente"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="min-w-[10rem] px-3 text-center font-mono text-[11px] uppercase tracking-wider text-foreground">
          {weekLabel}
        </span>
        <Link
          href={hrefFor(nextFrom)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-r-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Settimana successiva"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <select
        value={clientId ?? ""}
        onChange={(e) => {
          const next = e.target.value;
          window.location.href = hrefFor(weekFrom, next || undefined);
        }}
        className={cn(
          "h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm",
        )}
        aria-label="Filtra per cliente"
      >
        <option value="">Tutti i clienti</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Link
        href={hrefFor(new Date())}
        className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        Questa settimana
      </Link>
    </div>
  );
}
