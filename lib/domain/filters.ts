/**
 * Filter executor: prende un ParsedFilter e ritorna i task matchanti.
 *
 * Strategia: tutte le clausole base in SQL via Drizzle, label-match via INNER JOIN
 * con HAVING count = N (semantica AND su tutte le label specificate).
 */

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  isNotNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { addDays } from "date-fns";

import { db, schema } from "@/lib/db";
import type { Task } from "@/lib/db/schema";
import type { ParsedFilter } from "@/lib/parsers/filter-dsl";

import { todayBoundsUtc } from "./tasks";

export type FilterContext = {
  organizationId: string;
  timezone: string;
};

export async function executeFilter(
  parsed: ParsedFilter,
  ctx: FilterContext,
): Promise<Task[]> {
  const conditions: Array<SQL> = [
    eq(schema.task.organizationId, ctx.organizationId),
    isNull(schema.task.deletedAt),
  ];

  // Status
  if (parsed.status === "open") {
    conditions.push(isNull(schema.task.completedAt));
  } else if (parsed.status === "completed") {
    conditions.push(isNotNull(schema.task.completedAt));
  }

  // Priorities
  if (parsed.priorities.length > 0) {
    conditions.push(inArray(schema.task.priority, parsed.priorities));
  }

  // Due
  if (parsed.due) {
    const { startUtc, endUtc } = todayBoundsUtc(ctx.timezone);
    if (parsed.due.kind === "today") {
      conditions.push(isNotNull(schema.task.scheduledAt));
      conditions.push(lt(schema.task.scheduledAt, endUtc));
    } else if (parsed.due.kind === "overdue") {
      conditions.push(isNotNull(schema.task.scheduledAt));
      conditions.push(lt(schema.task.scheduledAt, startUtc));
    } else if (parsed.due.kind === "withinDays") {
      conditions.push(isNotNull(schema.task.scheduledAt));
      conditions.push(lt(schema.task.scheduledAt, addDays(endUtc, parsed.due.days)));
    }
  }

  // Project name (case-insensitive)
  if (parsed.projectName) {
    const projectIds = await db
      .select({ id: schema.project.id })
      .from(schema.project)
      .where(
        and(
          eq(schema.project.organizationId, ctx.organizationId),
          ilike(schema.project.name, parsed.projectName),
        ),
      );
    if (projectIds.length === 0) return [];
    conditions.push(
      inArray(
        schema.task.projectId,
        projectIds.map((r) => r.id),
      ),
    );
  }

  // Client name
  if (parsed.clientName) {
    const clientIds = await db
      .select({ id: schema.client.id })
      .from(schema.client)
      .where(
        and(
          eq(schema.client.organizationId, ctx.organizationId),
          ilike(schema.client.name, parsed.clientName),
        ),
      );
    if (clientIds.length === 0) return [];
    conditions.push(
      inArray(
        schema.task.clientId,
        clientIds.map((r) => r.id),
      ),
    );
  }

  // Text query (ILIKE su title)
  if (parsed.textQuery) {
    conditions.push(ilike(schema.task.title, `%${parsed.textQuery}%`));
  }

  // Senza label: query semplice
  if (parsed.labelNames.length === 0) {
    return db.query.task.findMany({
      where: and(...conditions),
      orderBy: [asc(schema.task.scheduledAt), desc(schema.task.priority), asc(schema.task.order)],
    });
  }

  // Con label: INNER JOIN su task_label + label, HAVING count = N (AND su tutte le label)
  const labelMatchers = parsed.labelNames.map((n) => ilike(schema.label.name, n));
  const rows = await db
    .select({ task: schema.task })
    .from(schema.task)
    .innerJoin(schema.taskLabel, eq(schema.taskLabel.taskId, schema.task.id))
    .innerJoin(schema.label, eq(schema.label.id, schema.taskLabel.labelId))
    .where(
      and(
        ...conditions,
        eq(schema.label.organizationId, ctx.organizationId),
        or(...labelMatchers),
      ),
    )
    .groupBy(schema.task.id)
    .having(sql`count(distinct ${schema.label.name}) = ${parsed.labelNames.length}`)
    .orderBy(asc(schema.task.scheduledAt), desc(schema.task.priority), asc(schema.task.order));

  return rows.map((r) => r.task);
}
