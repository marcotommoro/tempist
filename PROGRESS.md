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

## Fase 6 — Polish ✅

**Data:** 2026-05-18

### Iterazioni eseguite

- **6.1** Dark mode (next-themes)
  * ThemeProvider in providers.tsx (attribute=class, system default)
  * ThemeSwitcher compatto in topbar (cycle light→dark→system)
  * ThemeSection radio in /settings
  * `lib/hooks/use-is-client.ts`: useSyncExternalStore per evitare hydration mismatch
    senza incorrere nella regola `react-hooks/set-state-in-effect`
- **6.2** Command palette (cmdk)
  * Cmd+K / Ctrl+K listener globale
  * Ricerca debouncata (150ms) su task/project/client via PostgreSQL ILIKE
  * Quick navigation a tutte le viste principali
  * CommandDialog esteso con title/description sr-only per a11y Radix
- **6.3** PWA (manifest + service worker)
  * `public/manifest.webmanifest` installable, theme colors, shortcuts
  * `public/icon.svg` 512x512 (PNG raster da generare per Lighthouse 100)
  * `public/sw.js`: cache-first per static, network-first per HTML, bypass API
  * ServiceWorkerRegister solo in NODE_ENV=production
  * Metadata + Viewport con themeColor dark/light + appleWebApp config
- **6.4** Import Todoist + Toggl CSV
  * Parser RFC 4180 in `lib/utils/csv-parse.ts` (~80 righe, no deps)
  * Auto-detect source da headers (`detectCsvSource` in lib/utils)
  * importTodoistTasks: PRIORITY 4→P1 (Todoist invertito), CONTENT→title, DUE→scheduledAt
  * importTogglTimeEntries: match client/project per nome (no auto-create)
  * Errori per-row catturati, continua su altri
  * ImportSection /settings con file upload max 5MB
- **6.5** A11y pass
  * Skip link "Salta al contenuto" visible-on-focus
  * `aria-current="page"` su SidebarLink active (client component dedicated)
  * `aria-label` su nav landmarks (sidebar/main nav/workspace/tools)
  * `id="main-content"` + `tabIndex={-1}` su `<main>` per skip target
  * Esistente review: icon buttons hanno aria-label, form inputs hanno Label

### Test coverage Fase 6

- **106 unit tests** verdi (era 94 a fine Fase 5) — +12 tests
  * 8 csv-parse (parser RFC 4180 edge cases)
  * 4 import-detect (Todoist/Toggl/unknown)
- `pnpm typecheck` zero errori, `pnpm lint` zero warning, `pnpm build` 19 routes

### Decisioni in corso d'opera

- **Web Push (4.6) confermato skipped** anche in Fase 6: notifiche in-app +
  email digest + report settimanale coprono i casi d'uso. VAPID setup in fase
  futura quando ci sarà HTTPS reale stabile.
- **SVG icon invece di PNG raster** per la PWA: copre installation flow ma
  perde 5-10 punti Lighthouse PWA. Da generare PNG 192/512 quando il design
  finale sarà disponibile (con tool come `sharp` o servizio esterno).
- **Parser CSV custom** invece di papaparse: zero dep, ~80 righe per coprire
  RFC 4180. Se in futuro arrivano CSV con encoding ISO-8859-1 o quoting più
  liberale, migriamo a papaparse.
- **A11y baseline raggiunto** ma non audited con axe-core CLI (sarebbe ideale
  in CI). Skip link + aria-current + landmark labels coprono i fix più
  impattanti per screen reader. PR follow-up: focus-visible review completa.

## Fase 5 — Report & Analytics ✅

**Data:** 2026-05-18

### Iterazioni eseguite

- **5.1** Analytics domain
  * `getHoursByDay` (TO_CHAR group by giorno)
  * `getProjectBreakdown` (ore + entries + billable per project)
  * `getCompletedTasksByDay` (count completed)
  * `getTasksByPriority` (open vs completed per P1..P4)
  * `getOpenTasksByLabel` (count open task con label)
- **5.2** Charts dashboard `/reports` con Recharts 3.8.1
  * `HoursByDayChart` (BarChart) + `ClientPieChart` (PieChart)
  * `computeReportRange` (settimana/scorsa/mese, tz-aware) + `fillDailyGaps` puri
  * RangeToggle 3-opzioni
- **5.3** Export CSV time entries
  * `lib/utils/csv.ts` builder RFC 4180 (BOM UTF-8 per Excel-on-Windows, CRLF, escape)
  * GET `/api/reports/time-entries.csv?range=...` (13 colonne, opzionali clientId/projectId)
- **5.4** Print-friendly report page
  * Route group `app/(print)/` con layout senza sidebar
  * `/reports/print?range=...` ottimizzata Cmd+P → Save as PDF
  * `print:hidden` + `break-inside-avoid` per layout puliti
- **5.5** Report settimanale schedulato
  * `lib/domain/weekly-report.ts` + `lib/utils/weekly-report-render.ts` (puri)
  * Cron `weekly.report` hourly globale, filtra internamente per lunedì 08:00 tz utente
  * Dedupe via notification `Weekly:` creata oggi local-tz
  * `/settings` WeeklyReportSection con "Invia report di prova ora"

### Test coverage Fase 5

- **94 unit tests** verdi (era 79 a fine Fase 4) — +15 tests
  * 5 csv (escape, BOM, Date, boolean)
  * 5 report-range (week/month/last-week + tz, fillDailyGaps)
  * 5 weekly-report-render (text + html, escape XSS)
- `pnpm typecheck` zero errori, `pnpm lint` zero warning, `pnpm build` 19 routes
  (4 nuove: `/reports/print`, `/api/reports/time-entries.csv`, route group `(print)`)

### Decisioni in corso d'opera

- **Recharts 3.x** invece di Tremor: bundle più piccolo, API più stabile, scelta
  sostituibile dopo design senza grosso refactor (component API simile).
- **PDF via "HTML print"** invece di server-side generator: zero dep, copre 80%
  del valore. Server PDF (puppeteer / @react-pdf) entra in fase futura se servirà
  PDF schedulato in email.
- **Route group `(print)`** invece di `print:hidden` sulla sidebar: pulizia
  architetturale, evita di "spegnere" elementi che gli screen reader vedono
  comunque su versioni stampabili.

## Fase 4 — Calendar & Notifications ✅ (parziale: 4.6 Web Push skipped su richiesta utente)

**Data:** 2026-05-18

### Iterazioni eseguite

- **4.1** Notifications in-app
  * Dominio + 3 server actions, bell topbar con badge unread + popover
  * Trigger reali arrivano dai job (4.2, 4.4)
- **4.2** Reminder system + pg-boss scan job
  * `parseRelativeOffset` + `computeTriggerTime` (pure, testati)
  * Notazione: `-30m`, `-1h`, `-1d`, `-1w` (`+` per dopo scheduledAt)
  * `findDueReminders` + `fireReminder` con claim atomico (UPDATE...WHERE sent_at IS NULL)
  * Cron `* * * * *` worker; alle notifications di tipo `reminder.fired`
  * UI: `TaskReminderButton` popover (preset relativi + datetime picker)
  * `getPendingReminderCountByTask` aggregate, badge sui task
- **4.3** iCal feed (read-only)
  * `lib/utils/ics.ts` puro RFC 5545 (escape, fold, CRLF, status:completed)
  * Token random 24-byte hex (192 bit entropy), revocabile
  * Endpoint pubblico `/api/ical/[token]` con `text/calendar`
  * `/settings` IcalSection con generate/copy/revoke
- **4.4** Email digest giornaliero
  * `lib/integrations/email.ts` wrapper Resend con dev fallback console
  * Renderers puri (text + html) testabili in isolamento
  * `processDailyDigest`: ora locale check + dedupe via notification "Digest:"
  * Cron `0 * * * *` globale, filtra 08:00 user-tz internamente
  * `/settings` DigestSection con "Invia digest di prova"
- **4.5** Google Calendar OAuth + sync push-only
  * AES-256-GCM con chiave da BETTER_AUTH_SECRET via scrypt
  * Token cifrati at-rest; access token refresh on-demand 60s margin
  * OAuth: `/connect` redirect, `/callback` exchange (state = userId|orgId)
  * Cron `*/5 * * * *` sync push: INSERT/PATCH/DELETE primary calendar events
  * `calendar_event_link` binding task ↔ external event
  * UI `/settings` CalendarSection con connect (disabled se env mancanti) + disconnect
- **4.6** Web Push — **skipped** (scelta utente)
  * Le notifiche restano in-app + email digest. Da considerare in Fase 6.

### Test coverage Fase 4

- **79 unit tests** verdi (era 53 a fine Fase 3) — +26 tests
  * 13 reminder-time
  * 6 ics
  * 3 digest-render
  * 4 encryption
- `pnpm typecheck` zero errori, `pnpm lint` zero warning, `pnpm build` 19 routes
  (3 nuove API: /api/ical/[token], /api/integrations/google-calendar/{connect,callback})

### Decisioni in corso d'opera

- **Calendar sync push-only** invece di bidirezionale: ridotto scope da ~600 a ~250
  righe, scelta utente. Il pull (event → task) entra in fase futura quando il MVP
  girerà in produzione e ci sarà copy-back use case reale.
- **Web Push skipped**: richiede VAPID keys + HTTPS reale, valore incrementale basso
  rispetto a in-app + email. Rinviato.
- **Email helper estratto** in `lib/integrations/email.ts` per coerenza tra magic
  link e digest (DRY parziale — config.ts conserva il banner colorato dev).
- **Pattern "pure utils + impure domain"** consolidato: `today-bounds`, `reminder-time`,
  `ics`, `digest-render`, `encryption` sono tutti puri e testati in isolation.

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
