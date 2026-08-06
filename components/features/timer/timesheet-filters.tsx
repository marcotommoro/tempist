"use client";

import Link from "next/link";
import { useMemo } from "react";
import { addMonths, addWeeks, startOfMonth, subMonths, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Client } from "@/lib/db/schema";
import type { TimesheetPreset } from "@/lib/utils/timesheet-week";
import { timesheetSearchParams } from "@/lib/utils/timesheet-week";
import { cn } from "@/lib/utils";

type ProjectPick = { id: string; name: string; clientId: string | null };

export function TimesheetFilters({
  periodFrom,
  periodLabel,
  preset,
  clients,
  projects,
  clientId,
  projectId,
}: {
  periodFrom: Date;
  periodLabel: string;
  preset: TimesheetPreset;
  clients: Pick<Client, "id" | "name">[];
  projects: ProjectPick[];
  clientId?: string;
  projectId?: string;
}) {
  const prevFrom =
    preset === "week"
      ? subWeeks(periodFrom, 1)
      : startOfMonth(subMonths(startOfMonth(periodFrom), 1));
  const nextFrom =
    preset === "week"
      ? addWeeks(periodFrom, 1)
      : startOfMonth(addMonths(startOfMonth(periodFrom), 1));

  function hrefFor(opts: {
    from?: Date;
    preset?: TimesheetPreset | null;
    nextClientId?: string | null;
    nextProjectId?: string | null;
  }): string {
    const resolvedPreset =
      opts.preset === null
        ? undefined
        : (opts.preset ?? (preset === "custom" ? undefined : preset));
    const q = timesheetSearchParams({
      from: opts.from ?? periodFrom,
      preset: resolvedPreset === "custom" ? undefined : resolvedPreset,
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

  const visibleProjects = useMemo(() => {
    if (!clientId) return projects;
    return projects.filter((p) => p.clientId === clientId);
  }, [clientId, projects]);

  const prevLabel =
    preset === "week" ? "Periodo precedente" : "Mese precedente";
  const nextLabel =
    preset === "week" ? "Periodo successivo" : "Mese successivo";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card">
        <Link
          href={hrefFor({ from: prevFrom })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-l-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={prevLabel}
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="min-w-[10rem] px-3 text-center font-mono text-[0.6875em] uppercase tracking-wider text-foreground">
          {periodLabel}
          {preset === "custom" && (
            <span className="ml-1.5 text-coral">·custom</span>
          )}
        </span>
        <Link
          href={hrefFor({ from: nextFrom })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-r-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={nextLabel}
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <select
        value={clientId ?? ""}
        onChange={(e) => {
          const next = e.target.value;
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
        href={hrefFor({
          from: startOfMonth(new Date()),
          preset: "month",
        })}
        className={cn(
          "font-mono text-[0.625em] uppercase tracking-wider hover:text-foreground",
          preset === "month" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Questo mese
      </Link>
      <Link
        href={hrefFor({ from: new Date(), preset: "week" })}
        className={cn(
          "font-mono text-[0.625em] uppercase tracking-wider hover:text-foreground",
          preset === "week" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Questa settimana
      </Link>
    </div>
  );
}
