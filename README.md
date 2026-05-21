# Tempist

Web app full-stack che unisce le funzionalità di **Todoist** (task, progetti, ricorrenze, notifiche) con un **time tracker professionale** stile Toggl (clienti, timer, ore fatturabili, report).

Lo sviluppo è organizzato in fasi (vedi `PROGRESS.md`).

## Stack

- **Next.js 16** (App Router, RSC, Server Actions, Turbopack default)
- **TypeScript strict** (con `noUncheckedIndexedAccess`)
- **Drizzle ORM** + **node-postgres** (Postgres locale dev / Coolify prod)
- **Better Auth** (magic link via Resend + Google + GitHub + plugin `organization`)
- **Tailwind CSS v4** + **shadcn/ui** (componenti neutri in MVP)
- **TanStack Query v5** + **Zustand** (stato client)
- **pg-boss** per i job (cron, retry, queue — sullo stesso DB Postgres)
- **Resend** per email transazionali
- **Vitest** + **Playwright** per test
- Deploy prod via **Docker** su **Coolify** self-hosted

## Setup locale

### Prerequisiti

- **Node 22** (`.nvmrc`), pnpm 11+
- **Postgres 16+** locale via Homebrew: `brew install postgresql@16 && brew services start postgresql@16`

### Bootstrap

```bash
# Crea i database locali
createdb todoist_dev
createdb todoist_test

# Configura le variabili d'ambiente
cp .env.example .env.local
# Compila: DATABASE_URL, BETTER_AUTH_SECRET (>=32 char), BETTER_AUTH_URL=http://localhost:3000
# Opzionali: RESEND_API_KEY, GOOGLE_CLIENT_*, GITHUB_CLIENT_*

# Installa deps
pnpm install

# Applica le migrations
pnpm db:migrate

# Popola dati demo (opzionale)
pnpm db:seed
```

### Sviluppo

In due tab separati:

```bash
# Tab 1 — Next.js (porta 3000)
pnpm dev

# Tab 2 — Worker pg-boss
pnpm worker:dev
```

Aprire <http://localhost:3000>.

## Comandi principali

| Comando | Descrizione |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm worker:dev` | Worker pg-boss (process separato) |
| `pnpm typecheck` | TypeScript strict check |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (unit + integration) |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm build` | Build standalone produzione |
| `pnpm db:generate` | Genera SQL migration da diff schema |
| `pnpm db:migrate` | Applica migrations al DB |
| `pnpm db:push` | Sync schema diretto (solo dev) |
| `pnpm db:seed` | Popola dati demo |
| `pnpm db:studio` | GUI Drizzle Studio |
| `pnpm auth:generate` | Riconcilia schema Better Auth |

## Struttura del progetto

```
app/                  Next.js App Router
  (auth)/             Routes pubbliche (sign-in, verify-request)
  (app)/              Routes autenticate (today, inbox, projects, ...)
  api/auth/[...all]/  Better Auth handler
  layout.tsx          Root layout + Providers
  providers.tsx       TanStack Query provider
components/
  ui/                 Primitives shadcn (button, input, dialog, ...)
  features/           Componenti per dominio (popolati dalle fasi)
lib/
  auth/               Better Auth config + client + workspace helpers
  db/                 Drizzle schema + client + seed
  jobs/               pg-boss singleton + job definitions
  parsers/            (Fase 1+) NLP Quick Add, RRULE, filter DSL
  integrations/       (Fase 4+) Google/Outlook calendar, Resend
  stores/             Zustand stores
  utils/              Utility puri
worker/               Entry point del worker pg-boss
drizzle/              SQL migrations generate
tests/
  unit/               Test unit (Vitest)
  integration/        Test integration (Vitest)
  e2e/                Test end-to-end (Playwright)
docs/
  architecture/       Data model, ADR
  deployment/         Guida Coolify
  phases/             README di ogni fase quando completata
```

## Deploy produzione (Coolify)

Vedi `docs/deployment/coolify.md`.

## Fasi di sviluppo

| Fase | Stato | Tema |
|---|---|---|
| 0 | ✅ Setup | Bootstrap, schema, auth, layout, CI, Docker |
| 1 | ⏳ | Task management core (Todoist-like) |
| 2 | ⏳ | Time tracking core |
| 3 | ⏳ | Integrazione Task ↔ Timer |
| 4 | ⏳ | Calendar + Notifications |
| 5 | ⏳ | Report + Analytics |
| 6 | ⏳ | Polish (PWA, import, command palette, a11y) |

Dettaglio in `PROGRESS.md`.
