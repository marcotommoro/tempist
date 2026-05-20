"use client";

import Link from "next/link";
import { useMemo } from "react";
import { addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Client } from "@/lib/db/schema";
import { timesheetSearchParams } from "@/lib/utils/timesheet-week";
import { cn } from "@/lib/utils";

type ProjectPick = { id: string; name: string; clientId: string | null };

export function TimesheetFilters({
  weekFrom,
  weekLabel,
  clients,
  projects,
  clientId,
  projectId,
  isCustomRange,
}: {
  weekFrom: Date;
  weekLabel: string;
  clients: Pick<Client, "id" | "name">[];
  projects: ProjectPick[];
  clientId?: string;
  projectId?: string;
  isCustomRange?: boolean;
}) {
  const prevFrom = subWeeks(weekFrom, 1);
  const nextFrom = addWeeks(weekFrom, 1);

  function hrefFor(opts: {
    from?: Date;
    nextClientId?: string | null;
    nextProjectId?: string | null;
  }): string {
    const q = timesheetSearchParams({
      from: opts.from ?? weekFrom,
      clientId:
        opts.nextClientId === null
          ? undefined
          : (opts.nextClientId ?? clientId),
      projectId:
        opts.nextProjectId === null
          ? undefined
          : (opts.nextProjectId ?? projectId),
    });
    return `/timesheet?${q}`;
  }

  // Filtra progetti per cliente selezionato (se presente)
  const visibleProjects = useMemo(() => {
    if (!clientId) return projects;
    return projects.filter((p) => p.clientId === clientId);
  }, [clientId, projects]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card">
        <Link
          href={hrefFor({ from: prevFrom })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-l-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Settimana precedente"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="min-w-[10rem] px-3 text-center font-mono text-[0.6875em] uppercase tracking-wider text-foreground">
          {weekLabel}
          {isCustomRange && (
            <span className="ml-1.5 text-coral">·custom</span>
          )}
        </span>
        <Link
          href={hrefFor({ from: nextFrom })}
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
          // Quando cambia il cliente, resetta il progetto (potrebbe non appartenergli)
          window.location.href = hrefFor({
            nextClientId: next || null,
            nextProjectId: null,
          });
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
      <select
        value={projectId ?? ""}
        onChange={(e) => {
          const next = e.target.value;
          window.location.href = hrefFor({ nextProjectId: next || null });
        }}
        className={cn(
          "h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm",
        )}
        aria-label="Filtra per progetto"
      >
        <option value="">Tutti i progetti</option>
        {visibleProjects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Link
        href={hrefFor({ from: new Date() })}
        className="font-mono text-[0.625em] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        Questa settimana
      </Link>
    </div>
  );
}
