# ADR 0001 — Stack base

**Status:** Accepted
**Date:** 2026-05-15

## Context

Costruire un'app full-stack che unisce Todoist (task management) e un time tracker professionale (clienti, timer, billing). Requisiti:

- Multi-tenant dal day 1 (più utenti per workspace, ruoli)
- Self-hosted in produzione (Coolify), niente vendor lock-in serverless
- TypeScript-first
- Postgres come unica fonte di verità (anche per i job, niente Redis come dipendenza obbligatoria)
- Stack pragmatico, evita over-engineering precoce

## Decisione

| Layer | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Turbopack default) |
| Linguaggio | TypeScript strict + `noUncheckedIndexedAccess` |
| ORM | Drizzle ORM (TS-first, partial unique nativi, type inference) |
| Driver DB | node-postgres (pg) |
| Auth | Better Auth + plugin `magicLink` + `organization` |
| Multi-tenancy | Plugin `organization` di Better Auth (mappato come "Workspace" in UI) |
| Email | Resend |
| Job queue | pg-boss (schema dedicato `pgboss.*` nello stesso DB) |
| Realtime | Rimandato (polling TanStack Query in Fase 1-3) |
| Stile | Tailwind v4 + shadcn/ui |
| Stato client | TanStack Query (server) + Zustand (UI) |
| Form | react-hook-form + zod |
| Test | Vitest + Playwright |
| Hosting prod | Server self-hosted via Coolify, Dockerfile standalone |

## Alternative considerate

### ORM: Prisma vs Drizzle

**Inizialmente:** Prisma. **Cambiato:** Drizzle.

| Punto | Prisma 7 | Drizzle |
|---|---|---|
| Definizione schema | DSL `.prisma` | TS pure |
| Partial unique index | Solo via raw SQL migration | Nativo (`uniqueIndex().where(sql...)`) |
| Decimal precisione | Tipo `Decimal` JS (rischio cast) | String (no perdita precisione) |
| Migration tooling | Migrate (maturissimo) | drizzle-kit (semplice ma efficace) |
| Curva apprendimento | Bassa | Bassa per chi sa SQL |
| Type inference | Generated client | `$inferSelect/$inferInsert` |
| Performance | Buona | Più snella (no codegen) |

**Trigger del cambio:** Prisma 7 richiede `prisma.config.ts` + driver adapter — l'overhead di config diventa pari a Drizzle, e Drizzle ci dà partial unique gratis (cruciale per "un timer attivo per utente").

### Realtime: SaaS (Pusher/Ably) vs Postgres-native vs Polling

**Scelto:** rimandare. Per Fase 1-3 basta polling. Fase 4 valuteremo:
- LISTEN/NOTIFY + SSE custom (zero infra, ~100 righe plumbing)
- ElectricSQL self-hosted (DX eccellente, +1 container)
- Ably SaaS (zero plumbing, free tier 6M msg/mese)

### Job queue: Inngest vs Trigger.dev vs pg-boss vs Vercel Cron

**Scelto:** pg-boss. Motivazioni:
- Zero dipendenze esterne (vive in Postgres)
- Cron, retry, group concurrency built-in
- Transazionale: "crea task + scheduler reminder" in una sola tx DB
- Worker process separato gira come container Coolify

**Contro accettati:** niente dashboard built-in (pg-bossman opzionale), niente event-driven workflow nativo (gestiamo a mano con `boss.send`).

### Hosting: Vercel vs self-hosted

**Scelto:** Coolify self-hosted (richiesta utente). Tutto in Docker:
- App: Next standalone output (image ~50MB)
- Worker: container separato, stesso `DATABASE_URL`
- Postgres: gestito dall'utente in Coolify
- TLS via Let's Encrypt (Coolify automatico)

## Conseguenze

**Positive:**
- Zero vendor lock-in
- Costi prevedibili (1 server self-hosted)
- Stack omogeneo (tutto su Postgres: dati app + sessioni Better Auth + queue pg-boss)
- Sviluppatori possono lavorare offline (Postgres locale via Homebrew)

**Negative / da monitorare:**
- Drizzle ecosystem più giovane di Prisma (meno tooling, meno tutorial)
- pg-boss richiede sempre un worker process — su Coolify è banale, su Vercel sarebbe impossibile (ma non è il nostro target)
- Realtime "rimandato" può creare friction se in Fase 1-3 emerge un caso d'uso urgente — sarà da rivalutare allora

## Note di implementazione

- Tutti gli ID app-generated usano `nanoid(24)` (sicuri, URL-safe, ~16 char più corti di UUID)
- Timestamps: `timestamp { withTimezone: true, mode: "date" }` su tutta la linea
- Decimal per tariffe: `numeric(12, 2)` salvato come string lato app
- Soft delete via `deletedAt` su Task, Project, Client
- `session.activeOrganizationId` (da plugin `organization`) e' la fonte di verita per il workspace corrente
