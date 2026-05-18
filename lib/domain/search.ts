/**
 * Search domain — unified text search across task, project, client.
 * Usato dalla command palette.
 */

import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

export type SearchResult =
  | { kind: "task"; id: string; title: string; projectId: string | null }
  | { kind: "project"; id: string; name: string; color: string }
  | { kind: "client"; id: string; name: string; color: string };

export async function searchAll(opts: {
  organizationId: string;
  query: string;
  limit?: number;
}): Promise<SearchResult[]> {
  const q = opts.query.trim();
  if (q.length === 0) return [];
  const limit = opts.limit ?? 8;
  const like = `%${q}%`;

  // Eseguiamo 3 query in parallelo
  const [tasks, projects, clients] = await Promise.all([
    db
      .select({
        id: schema.task.id,
        title: schema.task.title,
        projectId: schema.task.projectId,
      })
      .from(schema.task)
      .where(
        and(
          eq(schema.task.organizationId, opts.organizationId),
          isNull(schema.task.deletedAt),
          or(
            ilike(schema.task.title, like),
            ilike(schema.task.descriptionMarkdown, like),
          ),
        ),
      )
      .orderBy(sql`completed_at NULLS FIRST`)
      .limit(limit),
    db
      .select({
        id: schema.project.id,
        name: schema.project.name,
        color: schema.project.color,
      })
      .from(schema.project)
      .where(
        and(
          eq(schema.project.organizationId, opts.organizationId),
          isNull(schema.project.deletedAt),
          isNull(schema.project.archivedAt),
          ilike(schema.project.name, like),
        ),
      )
      .limit(limit),
    db
      .select({
        id: schema.client.id,
        name: schema.client.name,
        color: schema.client.color,
      })
      .from(schema.client)
      .where(
        and(
          eq(schema.client.organizationId, opts.organizationId),
          isNull(schema.client.deletedAt),
          ilike(schema.client.name, like),
        ),
      )
      .limit(limit),
  ]);

  return [
    ...tasks.map(
      (t): SearchResult => ({
        kind: "task",
        id: t.id,
        title: t.title,
        projectId: t.projectId,
      }),
    ),
    ...projects.map(
      (p): SearchResult => ({
        kind: "project",
        id: p.id,
        name: p.name,
        color: p.color,
      }),
    ),
    ...clients.map(
      (c): SearchResult => ({
        kind: "client",
        id: c.id,
        name: c.name,
        color: c.color,
      }),
    ),
  ];
}
