import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listClients } from "@/lib/domain/clients";
import { ClientList } from "@/components/features/clients/client-list";
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

      {clients.length > 0 && <ClientList clients={clients} />}
    </div>
  );
}
