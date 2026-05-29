"use server";

/**
 * Quick Add server action — resolve names→IDs poi crea il task.
 *
 * Policy:
 *  - Project per nome → REQUIRE existence (typing #foo non crea progetti per evitare typo)
 *  - Client per nome  → REQUIRE existence (idem)
 *  - Label per nome   → AUTO-CREATE se mancante (pattern Todoist-like)
 *
 * Match fuzzy whole-word (vedi `lib/utils/fuzzy-match.ts`):
 *  - token espliciti `#nome`/`!cliente:nome` → matchByName, errore se 0 o ≥ 2 match
 *  - free-text nel titolo → findFreeTextMatch, silent skip se 0 o ≥ 2 match
 */

import { revalidatePath } from "next/cache";
import { and, eq, ilike, or } from "drizzle-orm";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import { db, schema } from "@/lib/db";
import { listClients } from "@/lib/domain/clients";
import { listProjects } from "@/lib/domain/projects";
import { createTask } from "@/lib/domain/tasks";
import {
  findFreeTextMatch,
  matchByName,
  stripFreeTextMatch,
} from "@/lib/utils/fuzzy-match";
import { normalizeDescriptionHtml } from "@/lib/utils/html";
import { parseQuickAdd } from "@/lib/parsers/quick-add";
import {
  defaultTaskScheduledAt,
  userTimezone,
} from "@/lib/utils/default-task-scheduled-at";
import type { ActionResult } from "./tasks";

const VIEW_PATHS = ["/today", "/inbox", "/upcoming"];

export async function createTaskFromQuickAddAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, organizationId } = await requireActiveOrganization();
    const input = String(formData.get("input") ?? "").trim();
    if (!input) return { ok: false, error: "Input vuoto" };

    const parsed = parseQuickAdd(input, {
      now: new Date(),
      timezone: userTimezone(user),
    });
    if (!parsed.title) {
      return { ok: false, error: "Il titolo non puo' essere vuoto dopo i token" };
    }

    const descriptionMarkdown = normalizeDescriptionHtml(
      formData.get("descriptionMarkdown")?.toString(),
    );
    // Selezione esplicita dalle tendine: ha la precedenza sul token nel titolo.
    const explicitProjectId = String(formData.get("projectId") ?? "").trim();
    const explicitClientId = String(formData.get("clientId") ?? "").trim();
    // Sezione: passata dal contesto (dialog aperto da una sezione di progetto).
    const sectionId = String(formData.get("sectionId") ?? "").trim() || null;

    // Carica una sola volta progetti+clienti dell'org per fuzzy match (token + free-text).
    const [projects, clients] = await Promise.all([
      listProjects({ organizationId }),
      listClients({ organizationId }),
    ]);

    // ---- Resolve project: tendina (esplicito) > token #nome (fuzzy whole-word) ----
    let projectId: string | null = null;
    if (explicitProjectId) {
      const proj = projects.find((p) => p.id === explicitProjectId);
      if (!proj) {
        return { ok: false, error: "Progetto selezionato non valido" };
      }
      projectId = proj.id;
    } else if (parsed.projectName) {
      const proj = matchByName(parsed.projectName, projects);
      if (!proj) {
        return {
          ok: false,
          error: `Project "${parsed.projectName}" non trovato (o ambiguo). Crealo prima dalla sidebar.`,
        };
      }
      projectId = proj.id;
    }

    // ---- Resolve client: tendina (esplicito) > token !cliente:nome (fuzzy whole-word) ----
    let clientId: string | null = null;
    if (explicitClientId) {
      const cl = clients.find((c) => c.id === explicitClientId);
      if (!cl) {
        return { ok: false, error: "Cliente selezionato non valido" };
      }
      clientId = cl.id;
    } else if (parsed.clientName) {
      const cl = matchByName(parsed.clientName, clients);
      if (!cl) {
        return {
          ok: false,
          error: `Cliente "${parsed.clientName}" non trovato (o ambiguo). Crealo prima da /clients.`,
        };
      }
      clientId = cl.id;
    }

    // ---- Free-text auto-association: scansiona il titolo per match opportunistici.
    // Mai errore: in caso di nessun match o ambiguità, non si associa nulla.
    // Le parole che hanno triggerato il match vengono rimosse dal titolo (così
    // "alice 7 giugno mandare mail" salva il task con titolo "mandare mail",
    // cliente A.L.I.Ce. Italia, data 7 giugno).
    const wordsToStrip = new Set<string>();
    if (!projectId) {
      const m = findFreeTextMatch(parsed.title, projects);
      if (m) {
        projectId = m.item.id;
        for (const t of m.matchedTokens) wordsToStrip.add(t);
      }
    }
    if (!clientId) {
      const m = findFreeTextMatch(parsed.title, clients);
      if (m) {
        clientId = m.item.id;
        for (const t of m.matchedTokens) wordsToStrip.add(t);
      }
    }
    const finalTitle =
      wordsToStrip.size > 0
        ? stripFreeTextMatch(parsed.title, wordsToStrip)
        : parsed.title;
    if (!finalTitle) {
      return { ok: false, error: "Il titolo non puo' essere vuoto dopo i token" };
    }

    // ---- Resolve labels (auto-create missing) ----
    let labelIds: string[] = [];
    if (parsed.labelNames.length > 0) {
      const matchers = parsed.labelNames.map((n) => ilike(schema.label.name, n));
      const existing = await db.query.label.findMany({
        where: and(eq(schema.label.organizationId, organizationId), or(...matchers)),
      });
      const existingLower = new Map(existing.map((l) => [l.name.toLowerCase(), l]));
      // Mantiene l'ordine richiesto dall'utente
      for (const name of parsed.labelNames) {
        const found = existingLower.get(name.toLowerCase());
        if (found) {
          labelIds.push(found.id);
        } else {
          const [created] = await db
            .insert(schema.label)
            .values({ organizationId, name })
            .returning();
          if (created) {
            labelIds.push(created.id);
            existingLower.set(name.toLowerCase(), created);
          }
        }
      }
      // Dedup (se l'utente ha scritto @urgent @urgent)
      labelIds = Array.from(new Set(labelIds));
    }

    // ---- Create task ----
    const scheduledAt =
      parsed.scheduledAt ?? defaultTaskScheduledAt(userTimezone(user));

    const task = await createTask({
      organizationId,
      createdById: user.id,
      title: finalTitle,
      descriptionMarkdown,
      priority: parsed.priority,
      scheduledAt,
      estimatedMinutes: parsed.estimatedMinutes,
      projectId,
      // La sezione vale solo se c'è un progetto a cui appartiene.
      sectionId: projectId ? sectionId : null,
      clientId,
      recurrenceRule: parsed.recurrenceRule,
    });

    // ---- Link labels ----
    if (labelIds.length > 0) {
      await db
        .insert(schema.taskLabel)
        .values(labelIds.map((labelId) => ({ taskId: task.id, labelId })));
    }

    for (const p of VIEW_PATHS) revalidatePath(p);
    // Revalida anche le pagine contestuali da cui può essere stato creato.
    if (projectId) revalidatePath(`/projects/${projectId}`);
    if (clientId) revalidatePath(`/clients/${clientId}`);

    return { ok: true, data: { id: task.id } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore creazione task",
    };
  }
}
