"use client";

import Link from "next/link";

import type { ClientForEdit } from "@/components/features/clients/edit-client-dialog";
import { EditClientDialogButton } from "@/components/features/clients/edit-client-dialog";
import { EntityColorMarker } from "@/components/features/entity-color-marker";
import { QuickStartButton } from "@/components/features/timer/quick-start-button";

export function ClientList({ clients }: { clients: ClientForEdit[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
      {clients.map((c) => (
        <li key={c.id} className="group flex items-center gap-1">
          <Link
            href={`/clients/${c.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-accent/40"
          >
            <EntityColorMarker kind="client" color={c.color} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.875em] font-medium text-foreground">
                {c.name}
              </div>
              {c.email && (
                <div className="truncate text-[0.75em] text-muted-foreground">
                  {c.email}
                </div>
              )}
            </div>
            {c.hourlyRateDefault && (
              <span className="font-mono text-[0.6875em] tabular-nums text-muted-foreground">
                {c.hourlyRateDefault} {c.currency}/h
              </span>
            )}
          </Link>
          <div className="flex items-center gap-1 pr-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <QuickStartButton target={{ kind: "client", id: c.id, label: c.name }} />
            <EditClientDialogButton client={c} />
          </div>
        </li>
      ))}
    </ul>
  );
}
