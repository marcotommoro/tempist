import { sql, type AnyColumn, type SQL } from "drizzle-orm";

export function resolvedClientId(opts: {
  directClientId: string | null | undefined;
  projectClientId: string | null | undefined;
}): string | null {
  return opts.projectClientId ?? opts.directClientId ?? null;
}

export function belongsToClient(opts: {
  clientId: string;
  directClientId: string | null | undefined;
  projectClientId: string | null | undefined;
}): boolean {
  return resolvedClientId(opts) === opts.clientId;
}

export function resolvedClientIdSql(
  projectClientId: AnyColumn,
  directClientId: AnyColumn,
): SQL {
  return sql`coalesce(${projectClientId}, ${directClientId})`;
}

export function belongsToClientSql(
  projectClientId: AnyColumn,
  directClientId: AnyColumn,
  clientId: string,
): SQL {
  return sql`coalesce(${projectClientId}, ${directClientId}) = ${clientId}`;
}
