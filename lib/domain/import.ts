/**
 * Import CSV — Todoist tasks + Toggl time entries.
 *
 * Strategia per-source: parsers separati che ritornano dati normalizzati,
 * poi una funzione `bulkInsert*` che li inserisce in transazione.
 *
 * Errori per-row sono catturati e ritornati come parte del risultato
 * (non bloccano gli altri).
 */

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { parseCsv, type CsvRow } from "@/lib/utils/csv-parse";
import { createTask } from "./tasks";
import { createManualEntry } from "./time-entries";
export { detectCsvSource } from "@/lib/utils/import-detect";

// ---------------------------------------------------------------------------
// Todoist: tasks
// ---------------------------------------------------------------------------

/**
 * Mappa la priorità Todoist (1=normale → 4=urgent) ai nostri (P1=urgent → P4=normale).
 */
function mapTodoistPriority(p: string | undefined): "P1" | "P2" | "P3" | "P4" {
  switch (p) {
    case "4":
      return "P1";
    case "3":
      return "P2";
    case "2":
      return "P3";
    default:
      return "P4";
  }
}

function parseTodoistDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type ImportTodoistResult = {
  inserted: number;
  skipped: number;
  errors: { rowIndex: number; message: string }[];
};

export async function importTodoistTasks(opts: {
  organizationId: string;
  createdById: string;
  csv: string;
}): Promise<ImportTodoistResult> {
  const { rows } = parseCsv(opts.csv);
  const result: ImportTodoistResult = { inserted: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    try {
      // Skip sezioni e note (TYPE != task)
      const type = (r.TYPE ?? r.type ?? "task").toLowerCase();
      if (type && type !== "task") {
        result.skipped++;
        continue;
      }
      const title = (r.CONTENT ?? r.content ?? "").trim();
      if (!title) {
        result.skipped++;
        continue;
      }
      const scheduledAt =
        parseTodoistDate(r.DATE ?? r.date) ?? parseTodoistDate(r.DUE_DATE ?? r.due_date);
      await createTask({
        organizationId: opts.organizationId,
        createdById: opts.createdById,
        title,
        descriptionMarkdown: r.DESCRIPTION ?? r.description ?? null,
        priority: mapTodoistPriority(r.PRIORITY ?? r.priority),
        scheduledAt,
      });
      result.inserted++;
    } catch (err) {
      result.errors.push({
        rowIndex: i,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Toggl: time entries
// ---------------------------------------------------------------------------

function parseTogglDate(date: string, time: string): Date | null {
  if (!date || !time) return null;
  // Toggl export: "2026-05-15", "10:30:00"
  const iso = `${date}T${time}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type ImportTogglResult = {
  inserted: number;
  skipped: number;
  errors: { rowIndex: number; message: string }[];
};

/**
 * Importa Toggl CSV. Non crea client/project automaticamente — match per nome
 * sui client/project esistenti nell'org. Se match assente, time entry creata
 * senza link.
 */
export async function importTogglTimeEntries(opts: {
  organizationId: string;
  userId: string;
  csv: string;
}): Promise<ImportTogglResult> {
  const { rows } = parseCsv(opts.csv);
  const result: ImportTogglResult = { inserted: 0, skipped: 0, errors: [] };

  // Cache client/project per nome
  const clientByName = new Map<string, string>();
  const projectByName = new Map<string, string>();

  const clients = await db.query.client.findMany({
    where: eq(schema.client.organizationId, opts.organizationId),
  });
  for (const c of clients) clientByName.set(c.name.toLowerCase(), c.id);

  const projects = await db.query.project.findMany({
    where: eq(schema.project.organizationId, opts.organizationId),
  });
  for (const p of projects) projectByName.set(p.name.toLowerCase(), p.id);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    try {
      const startDate = r["Start date"] ?? r["start date"] ?? "";
      const startTime = r["Start time"] ?? r["start time"] ?? "";
      const endDate = r["End date"] ?? r["end date"] ?? "";
      const endTime = r["End time"] ?? r["end time"] ?? "";
      const startedAt = parseTogglDate(startDate, startTime);
      const endedAt = parseTogglDate(endDate, endTime);
      if (!startedAt || !endedAt) {
        result.skipped++;
        continue;
      }
      const description = (r.Description ?? r.description ?? "").trim();
      const clientName = (r.Client ?? r.client ?? "").trim().toLowerCase();
      const projectName = (r.Project ?? r.project ?? "").trim().toLowerCase();
      const billable = (r.Billable ?? r.billable ?? "").toLowerCase() === "yes";

      await createManualEntry({
        organizationId: opts.organizationId,
        userId: opts.userId,
        startedAt,
        endedAt,
        description,
        clientId: clientName ? clientByName.get(clientName) ?? null : null,
        projectId: projectName ? projectByName.get(projectName) ?? null : null,
        taskId: null,
        isBillable: billable,
      });
      result.inserted++;
    } catch (err) {
      result.errors.push({
        rowIndex: i,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Helper esposto per la action */
export { parseCsv };
export type { CsvRow };
