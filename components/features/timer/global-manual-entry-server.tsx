import { requireActiveOrganization } from "@/lib/auth/workspace";
import { listClients } from "@/lib/domain/clients";
import { listProjects } from "@/lib/domain/projects";
import { GlobalManualEntryDialog } from "./global-manual-entry-dialog";

export async function GlobalManualEntryServer() {
  const { organizationId } = await requireActiveOrganization();
  const [clients, projects] = await Promise.all([
    listClients({ organizationId }),
    listProjects({ organizationId }),
  ]);
  return <GlobalManualEntryDialog clients={clients} projects={projects} />;
}
