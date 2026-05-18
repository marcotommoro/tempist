import { notFound } from "next/navigation";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { getClient } from "@/lib/domain/clients";

type Params = { id: string };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const { organizationId } = await requireActiveOrganization();
  const client = await getClient({ clientId: id, organizationId });
  if (!client) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: client.color }}
            aria-hidden
          />
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {client.email && <span>📧 {client.email}</span>}
          {client.vatNumber && <span>P.IVA {client.vatNumber}</span>}
          {client.hourlyRateDefault && (
            <span>
              💶 {client.hourlyRateDefault} {client.currency}/h
            </span>
          )}
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Time entries
        </h2>
        <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
          Le voci di tracking arriveranno con l&apos;iterazione 2.3.
        </div>
      </section>
    </div>
  );
}
