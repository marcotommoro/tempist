import Link from "next/link";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listClients } from "@/lib/domain/clients";
import { CreateClientForm } from "@/components/features/clients/create-client-form";
import { PageHeader } from "@/components/features/page-header/page-header";

export default async function ClientsPage() {
  const { organizationId } = await requireActiveOrganization();
  const clients = await listClients({ organizationId });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        meta={
          <>
            <span>
              <span className="text-foreground tabular-nums">{clients.length}</span>{" "}
              {clients.length === 1 ? "client" : "clients"}
            </span>
            <span aria-hidden>·</span>
            <span>active</span>
          </>
        }
        description={
          clients.length === 0
            ? "Nessun cliente. Creane uno qui sotto."
            : undefined
        }
      />

      <CreateClientForm />

      {clients.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-accent/40"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: c.color }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-foreground">
                    {c.name}
                  </div>
                  {c.email && (
                    <div className="truncate text-[12px] text-muted-foreground">
                      {c.email}
                    </div>
                  )}
                </div>
                {c.hourlyRateDefault && (
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {c.hourlyRateDefault} {c.currency}/h
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
