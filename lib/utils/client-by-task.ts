/**
 * Mappa taskId → cliente da mostrare sulla card. Il cliente diretto del task
 * (task.clientId) vince; in fallback si usa il cliente del progetto a cui il
 * task appartiene. Pure function, testabile.
 */

export type ClientMeta = { name: string; color: string };

export function buildClientByTask(
  tasks: ReadonlyArray<{
    id: string;
    clientId: string | null;
    projectId: string | null;
  }>,
  projects: ReadonlyArray<{ id: string; clientId: string | null }>,
  clients: ReadonlyArray<{ id: string; name: string; color: string }>,
): Map<string, ClientMeta> {
  const clientsById = new Map(
    clients.map((c) => [c.id, { name: c.name, color: c.color }]),
  );
  const projectClientId = new Map(projects.map((p) => [p.id, p.clientId]));

  const out = new Map<string, ClientMeta>();
  for (const t of tasks) {
    const clientId =
      t.clientId ??
      (t.projectId ? (projectClientId.get(t.projectId) ?? null) : null);
    if (!clientId) continue;
    const meta = clientsById.get(clientId);
    if (meta) out.set(t.id, meta);
  }
  return out;
}
