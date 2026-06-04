# Flexible Reporting Redesign

## Obiettivo
Rendere `timesheet`, `reports` e dettaglio cliente più simili a un cockpit operativo: vista ampia, selezione mese sempre accessibile, filtri rapidi, sezioni attivabili e dati aggiornati immediatamente quando cambia l'URL. La soluzione resta server-first: i dati vengono calcolati in Server Components/domain functions, mentre i controlli client aggiornano `searchParams` con `router.replace(..., { scroll: false })` e `useTransition`.

## Contesto rilevante
- [`app/(app)/layout.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/layout.tsx) oggi forza tutte le pagine dentro `max-w-3xl`, limitando dashboard e tabelle.
- [`app/(app)/reports/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/reports/page.tsx) supporta solo `week | last-week | month`, dove `month` significa mese corrente.
- [`app/(app)/timesheet/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/timesheet/page.tsx) ha range settimanale/custom, filtri client/progetto e default limit 200 entries.
- [`app/(app)/clients/[id]/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/clients/[id]/page.tsx) ha logiche range locali e una colonna unica, pur contenendo billing, quick grid, tasks e time entries.
- Next 16 docs: `searchParams` va letto nel Page Server Component; `useSearchParams`/`useRouter` sono per Client Components e vanno isolati con `Suspense` quando necessario. `next/form` e navigazione client-side sono utili per filtri GET progressivi. Context7 conferma pattern React 19 con `useTransition` per UI responsive e Recharts 3 con `ResponsiveContainer`/`ComposedChart` per dashboard.

## Design Proposto
### 1. Layout Wide Scoped
Modificare [`app/(app)/layout.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/layout.tsx) per mantenere il default stretto ma permettere a specifiche pagine di espandersi. La soluzione più mirata è usare un marker tipo `data-page-width="wide"` sul root delle tre pagine e una regola Tailwind/CSS con `:has()` sul wrapper interno. Così `today`, `inbox`, `projects` ecc. restano invariati.

### 2. Modello Filtri Condiviso
Creare un helper type-safe, ad esempio [`lib/utils/reporting-range.ts`](/Users/marcotommoro/dev/tempist/lib/utils/reporting-range.ts), che sostituisce la duplicazione tra `report-range.ts`, `timesheet-week.ts` e `resolveRange()` locale cliente. Supporterà:
- `month=YYYY-MM` per scegliere qualunque mese.
- `period=month | week | custom | all` dove serve.
- `from/to` validati per custom range, con bound `[from, to)` coerenti.
- preservazione di `clientId`, `projectId`, `view`, `groupBy`, `show`.

### 3. Componenti Riusabili
Aggiungere componenti in [`components/features/reports/`](/Users/marcotommoro/dev/tempist/components/features/reports/) riutilizzabili da tutte e tre le pagine:
- `ReportingToolbar`: selettore mese con prev/next, shortcut "oggi", custom range, client/project select, reset, stato pending.
- `ViewToggleBar`: tasti per scegliere cosa vedere (`overview`, `charts`, `clients`, `projects`, `entries`, `tasks`, `grid`).
- `MetricGrid`: KPI card coerenti e più leggibili.
- `DataPanel`: card/tabelle con header, count, empty state, azioni export.

I controlli aggiornano la query string con una whitelist di chiavi note, evitando URL non sanitizzati e mantenendo i filtri condivisi tra CSV/print/pagine.

### 4. Reports Page
Ristrutturare [`app/(app)/reports/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/reports/page.tsx) in dashboard ampia:
- Toolbar sticky con mese, range custom, client, project, `groupBy` e `show`.
- KPI in griglia larga: ore, fatturabile, non fatturabile, entries, task completati, media giornaliera.
- Grafico principale tipo Clockify/Kimai con Recharts `ComposedChart`: ore per giorno più billable/internal.
- Sezioni attivabili: per cliente, per progetto, trend giornaliero, tabella dettagliata.
- Export CSV e print preservano gli stessi parametri.

Estendere [`lib/domain/time-entries.ts`](/Users/marcotommoro/dev/tempist/lib/domain/time-entries.ts), [`lib/domain/analytics.ts`](/Users/marcotommoro/dev/tempist/lib/domain/analytics.ts) e [`lib/domain/tasks.ts`](/Users/marcotommoro/dev/tempist/lib/domain/tasks.ts) per accettare filtri `clientId`, `projectId`, billable/internal e grouping senza perdere `organizationId` in ogni query.

### 5. Timesheet Page
Aggiornare [`app/(app)/timesheet/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/timesheet/page.tsx) e [`components/features/timer/timesheet-filters.tsx`](/Users/marcotommoro/dev/tempist/components/features/timer/timesheet-filters.tsx):
- Passare da navigazioni hard via `window.location.href` a `router.replace` con `useTransition`.
- Aggiungere mese selezionabile (`month=YYYY-MM`) e toggle vista `day | week | month`.
- Layout più ampio con tabella entries più densa, totali sopra e raggruppamenti collassabili.
- Rimuovere il limite implicito fragile da 200 per i mesi, sostituendolo con un limite esplicito adeguato o paginazione leggera se i dati sono tanti.

### 6. Client Detail Page
Ristrutturare [`app/(app)/clients/[id]/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/clients/[id]/page.tsx) come dashboard cliente:
- Header largo con azioni rapide, rate, email/P.IVA e mese attivo.
- Toolbar unica per billing range e week grid, preservando i parametri.
- Sezioni flessibili: overview, quick grid, breakdown progetti, tasks, time entries.
- Vista d'insieme tipo Trello/Clockify: colonne o pannelli per progetto con ore, importo, entries e task collegati.
- [`components/features/timer/client-billing-filters.tsx`](/Users/marcotommoro/dev/tempist/components/features/timer/client-billing-filters.tsx) diventa un wrapper del nuovo `ReportingToolbar` invece di mantenere logica range locale.

### 7. Export, Print e Coerenza URL
Aggiornare [`app/api/reports/time-entries.csv/route.ts`](/Users/marcotommoro/dev/tempist/app/api/reports/time-entries.csv/route.ts) e [`app/(print)/reports/print/page.tsx`](/Users/marcotommoro/dev/tempist/app/(print)/reports/print/page.tsx) per usare lo stesso parser filtri. In questo modo mese, custom range, client e progetto producono gli stessi dati in pagina, CSV e stampa.

### 8. Verifica
Aggiungere o aggiornare test mirati:
- Unit test per parser range/search params in [`tests/unit/`](/Users/marcotommoro/dev/tempist/tests/unit/).
- Test domain per aggregazioni filtrate dove già esistono fixture utili.
- E2E leggero Playwright: cambiare mese su reports/client/timesheet e verificare URL, KPI/heading aggiornati e assenza di reload pieno.
- Verifiche finali: `pnpm lint`, `pnpm typecheck`, `pnpm test`, e se tempo/DB disponibile `pnpm test:e2e` mirato.

## Sequenza Di Lavoro
1. Introdurre helper filtri/range condiviso e test unitari.
2. Rendere il layout wide scoped senza cambiare il comportamento delle pagine non coinvolte.
3. Implementare componenti riusabili toolbar/toggle/metric/panel.
4. Migrare reports e sincronizzare CSV/print.
5. Migrare timesheet.
6. Migrare dettaglio cliente.
7. Eseguire test, browser check e rifinitura responsive/accessibile.

## Todo
- [ ] Creare parser range/search params condiviso con test unitari.
- [ ] Rendere wide solo le pagine marcate senza alterare le altre viste app.
- [ ] Costruire toolbar, toggle e pannelli riusabili per reports/timesheet/clienti.
- [ ] Redesign reports con mese libero, filtri immediati, chart e export coerenti.
- [ ] Redesign timesheet con mese libero, viste raggruppate e navigazione client-side.
- [ ] Redesign dettaglio cliente come dashboard flessibile con sezioni attivabili.
- [ ] Aggiungere test mirati e verificare lint/typecheck/test.
