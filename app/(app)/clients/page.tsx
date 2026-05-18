import Link from "next/link";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listClients } from "@/lib/domain/clients";
import { CreateClientForm } from "@/components/features/clients/create-client-form";

export default async function ClientsPage() {
  const { organizationId } = await requireActiveOrganization();
  const clients = await listClients({ organizationId });

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Clienti</h1>
        <p className="text-sm text-muted-foreground">
          {clients.length === 0
            ? "Nessun cliente. Creane uno qui sotto."
            : `${clients.length} client${clients.length === 1 ? "e" : "i"} attiv${clients.length === 1 ? "o" : "i"}.`}
        </p>
      </header>

      <CreateClientForm />

      {clients.length > 0 && (
        <ul className="divide-y divide-border rounded-md border bg-card">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: c.color }}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  {c.email && (
                    <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                  )}
                </div>
                {c.hourlyRateDefault && (
                  <span className="text-xs text-muted-foreground tabular-nums">
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
