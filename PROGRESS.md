# Progress

## Fase 0 — Setup ✅ (in completamento)

**Data:** 2026-05-15

### Cosa è stato fatto

- [x] **0.1** Bootstrap Next.js 16 + TypeScript strict (con `noUncheckedIndexedAccess`)
- [x] **0.2** Postgres locale via Homebrew + `.env.example` documentato
- [x] **0.3** Drizzle ORM + schema completo (25 tabelle: 7 Better Auth + 18 app)
- [x] **0.4** Better Auth (magic link + Google + GitHub + organization plugin) con hook post-signup
- [x] **0.5** Layout app + shadcn/ui base (button, input, dialog, dropdown-menu, sheet, tabs, popover, separator, avatar, badge, sonner)
- [x] **0.6** pg-boss singleton + worker entry + job dummy `health-check`
- [x] **0.7** Vitest + Playwright + 1 unit test + 1 integration placeholder + 1 E2E smoke
- [x] **0.8** GitHub Actions CI (lint, typecheck, db migrate, test, build su servizio Postgres)
- [x] **0.9** Documentazione bootstrap (README + ADR 0001 + data-model.md + coolify.md)
- [x] **0.10** Dockerfile prod (Next standalone) + Dockerfile.worker + .dockerignore

### Decisioni prese in corso d'opera

1. **Prisma → Drizzle.** Inizialmente piano prevedeva Prisma 7. Drizzle scelto per: partial unique index nativi (utile per "un timer running per utente"), type inference senza step di generation, decimal-as-string evita perdita precisione su tariffe. Stack DB ora: `drizzle-orm` + `drizzle-kit` + `pg` (node-postgres).
2. **Hosting prod = Coolify self-hosted.** L'utente gestisce il server (incluso Postgres). Dockerfile multistage con `output: 'standalone'` Next 16 → image ~50MB. Worker pg-boss in container separato.
3. **Realtime rimandato a Fase 4.** Per Fase 1-3 ci basta polling TanStack Query. Decisione informata quando il problema (timer cross-device, notifiche live) diventerà concreto.
4. **shadcn/ui setup manuale.** L'init CLI andava in interactive — abbiamo scritto `components.json` direttamente e aggiunto le primitives via `shadcn@latest add`. Tutto sano.

### Decisioni rimandate (esplicite)

| Cosa | Quando | Perché |
|---|---|---|
| Provider realtime (LISTEN/NOTIFY, Electric, Ably) | Fase 4 | Polling basta per Fase 1-3 |
| File storage (S3 vs MinIO self-hosted su Coolify) | Fase 1 (commenti+allegati) | Probabilmente MinIO per coerenza self-hosted |
| Charting (Recharts vs Tremor) | Fase 5 (reports) | Dopo design |
| Analytics (PostHog vs Plausible) | Fase 6 (polish) | Non bloccante |
| Web Push notifications | Fase 4 | Richiede HTTPS reale |

### Verifica end-to-end Fase 0

- ✅ `pnpm typecheck` → zero errori
- ✅ `pnpm test` → 6 test passati (2 file)
- ✅ `pnpm db:generate` → migration SQL prodotta correttamente (25 tabelle, partial unique index incluso)
- ⏳ `pnpm build` → da eseguire con env vars valide (richiede `DATABASE_URL` reale ma può girare con placeholder)
- ⏳ Smoke test manuale (signup magic link → /today)
- ⏳ Docker build prod
- ⏳ Deploy Coolify

### Prossimi passi

→ **Fase 3 — Integrazione Task ↔ Timer + UI dei collegamenti.**

## Fase 3 — Integrazione Task ↔ Timer ✅

**Data:** 2026-05-18

### Iterazioni eseguite

- **3.1** Aggregato `getTrackedSecondsByTask`
  * Single GROUP BY → `Map<taskId, seconds>` per O(1) lookup
  * Esclude `isRunning = true` (la live duration sta nel widget)
  * `getClientAggregates` per la dashboard (totali per cliente con billable amount)
- **3.2** Progress bar stima vs tracciato su TaskItem
  * `TaskProgress` component: bar con stato `over` (>100%) o testo standalone se niente stima
  * Tutte le pagine task-oriented (today/inbox/upcoming/filters/projects) fetchano e passano l'aggregato
- **3.3** Prompt durata al complete (Dialog)
  * `CompleteWithDurationDialog`: si apre solo se `estimatedMinutes > 0` && `trackedSeconds === 0`
  * Conferma → manual entry retroattiva linkata a task/project/client, poi toggle complete
  * Salta → toggle complete senza entry
- **3.4** Tasks linkati al cliente su `/clients/[id]`
  * `getTasksForClient` (solo `task.clientId` diretto — i task via project si vedono nella pagina project)
  * Sezione "Tasks" sopra Time entries con la stessa progress bar
- **3.5** Report dashboard `/reports`
  * `getCompletedTaskCountByClient` aggregate by clientId
  * Filtro week/month TZ-aware (`fromZonedTime + startOfWeek`)
  * Tabella per cliente: completed tasks, ore, voci, fatturabile (split per currency nei totali)

### Refactor in corso d'opera

- Estratto `todayBoundsUtc` in `lib/utils/today-bounds.ts` (funzione pura, niente import di `db`) — il test unit non richiede più `DATABASE_URL` per girare in isolamento.

### Test coverage Fase 3

- **53 unit tests** verdi (uguale a Fase 2, niente nuovi unit perché la logica nuova è UI/component)
- `pnpm typecheck` zero errori, `pnpm lint` zero warning, `pnpm build` 16 routes (`/reports` ora dinamica)

## Fase 2 — Time tracking core ✅

**Data:** 2026-05-18

### Iterazioni eseguite

- **2.1** Clients CRUD
  * `lib/domain/clients.ts` + `lib/actions/clients.ts` (4 actions con Zod)
  * `/clients` list + create, `/clients/[id]` detail
- **2.2** Timer core + widget topbar
  * `startTimer` (cattura unique violation 23505 da partial index DB-level)
  * `stopTimer` con `durationSeconds` calcolato
  * Timer widget live tick 1s (Server Component + Client Component)
- **2.3** TimeEntry list + manual entry retroattiva
  * `/clients/[id]` mostra stats (ore, fatturabile, # voci) + form retroattivo
  * `TimeEntryRow` con rate snapshot×ore e billable indicator
- **2.4** Billing rates gerarchici
  * `lib/domain/billing.ts` resolver con cascade TASK→PROJECT→CLIENT(+default)→USER
  * Snapshot ricco al momento del tracking (passa tutti gli scope al resolver)
  * `createBillingRate` immutabile (storia preservata)
- **2.5** Timer da task + audit log
  * `startTimerFromTask` eredita clientId/projectId/title
  * Pulsante Play su TaskItem (hover)
  * Audit log su CREATE e STOP (DELETE limitato dal cascade FK, TODO migration)
- **2.6** Test verifica
  * +9 nuovi unit test (durationSeconds + cascade order invariant)
  * Build verde (15 routes, +2 vs Fase 1: /clients, /clients/[id])

### Test coverage Fase 2

- **53 unit tests** verdi (era 44 a fine Fase 1)
- typecheck/lint zero issues, build verde

## Fase 1 — Task management core ✅

**Data:** 2026-05-18

### Iterazioni eseguite

- **1.1** Task CRUD reali su Today/Inbox/Upcoming
  * `lib/domain/tasks.ts` + `lib/actions/tasks.ts` + componenti TaskList/TaskItem/QuickAdd
  * `todayBoundsUtc` TZ-aware (Europe/Rome / NY / UTC test coverage)
- **1.2** Quick Add NLP
  * `lib/parsers/quick-add.ts`: chrono-node + token `#proj @label p1..p4 !cliente:X 60min`
  * Resolve names→IDs: project/client REQUIRE existence; label AUTO-CREATE
  * Live preview chips colorate
- **1.3** Projects + Sections CRUD
  * Domain + 7 server actions
  * Sidebar dinamico (favorites + projects list)
  * `/projects` list, `/projects/[id]` detail con sezioni
- **1.4** Labels + Filter DSL
  * Parser `priority:P1 @urgent due:7d is:open` (AND-only)
  * Executor con INNER JOIN+HAVING per label-AND
  * Saved filters CRUD + `/filters/[id]` view
- **1.5** Board Kanban (@dnd-kit)
  * Drag-and-drop cross-column + reorder within
  * Toggle List | Board su `/projects/[id]?view=board`
  * `moveTaskAction` in transazione (riassegna order per la colonna intera)
- **1.6** Recurring tasks (RRULE)
  * `lib/parsers/recurrence.ts` IT/EN keywords + pass-through RRULE
  * `computeNextOccurrence` con DTSTART anchoring
  * `toggleTaskComplete` spawn-a next occurrence
  * Quick Add esteso: `repeats:every monday`

### Test coverage Fase 1

- **44 unit tests** verdi (era 11 a fine Fase 0)
  * 13 quick-add NLP parser
  * 5 today-bounds TZ
  * 9 filter-dsl
  * 9 recurrence
  * 6 format-duration + 2 placeholder integration
- `pnpm typecheck` zero errori, `pnpm lint` zero warning, `pnpm build` 15 routes
