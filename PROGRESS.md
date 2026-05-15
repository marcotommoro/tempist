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

→ **Fase 1 — Task management core.**

Pianificheremo Fase 1 in dettaglio dopo review Fase 0. Comprenderà:
- Modelli operativi (Drizzle queries) per Task/Project/Section/Label
- Quick Add con NLP (chrono-node + parser custom `#proj @label p1 cliente:X`)
- Viste: List, Board (Kanban con @dnd-kit), Calendar (weekly)
- Filtri custom con mini DSL
- Task ricorrenti (RRULE iCal)
- Inbox / Today / Upcoming come viste virtuali
- 70%+ test coverage su parser e logica business
