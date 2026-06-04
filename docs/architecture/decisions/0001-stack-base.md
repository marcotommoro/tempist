# ADR 0001 — Base stack

**Status:** Accepted
**Date:** 2026-05-15

## Context

Build a full-stack app that combines Todoist-style task management and a professional time tracker (clients, timer, billing). Requirements:

- Multi-tenant from day 1 (multiple users per workspace, roles)
- Self-hosted in production (Coolify), no serverless vendor lock-in
- TypeScript-first
- Postgres as the single source of truth (jobs too — no Redis as a mandatory dependency)
- Pragmatic stack, avoid premature over-engineering

## Decision

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Turbopack default) |
| Language | TypeScript strict + `noUncheckedIndexedAccess` |
| ORM | Drizzle ORM (TS-first, native partial uniques, type inference) |
| DB driver | node-postgres (pg) |
| Auth | Better Auth + `magicLink` + `organization` plugins |
| Multi-tenancy | Better Auth `organization` plugin (mapped as "Workspace" in the UI) |
| Email | Resend |
| Job queue | pg-boss (dedicated `pgboss.*` schema in the same DB) |
| Realtime | Deferred (TanStack Query polling in Phases 1–3) |
| Styling | Tailwind v4 + shadcn/ui |
| Client state | TanStack Query (server) + Zustand (UI) |
| Forms | react-hook-form + zod |
| Tests | Vitest + Playwright |
| Production hosting | Self-hosted server via Coolify, Dockerfile standalone output |

## Alternatives considered

### ORM: Prisma vs Drizzle

**Initially:** Prisma. **Switched to:** Drizzle.

| Point | Prisma 7 | Drizzle |
|---|---|---|
| Schema definition | `.prisma` DSL | Pure TS |
| Partial unique index | Raw SQL migration only | Native (`uniqueIndex().where(sql...)`) |
| Decimal precision | JS `Decimal` type (cast risk) | String (no precision loss) |
| Migration tooling | Migrate (mature) | drizzle-kit (simple but effective) |
| Learning curve | Low | Low if you know SQL |
| Type inference | Generated client | `$inferSelect` / `$inferInsert` |
| Performance | Good | Leaner (no codegen) |

**Trigger for the change:** Prisma 7 requires `prisma.config.ts` + a driver adapter — config overhead rivals Drizzle, and Drizzle gives us partial uniques for free (critical for "one active timer per user").

### Realtime: SaaS (Pusher/Ably) vs Postgres-native vs polling

**Chosen:** defer. Phases 1–3 are enough with polling. Phase 4 will evaluate:
- LISTEN/NOTIFY + custom SSE (zero infra, ~100 lines of plumbing)
- Self-hosted ElectricSQL (excellent DX, +1 container)
- Ably SaaS (zero plumbing, free tier 6M msg/month)

### Job queue: Inngest vs Trigger.dev vs pg-boss vs Vercel Cron

**Chosen:** pg-boss. Reasons:
- Zero external dependencies (lives in Postgres)
- Cron, retry, group concurrency built-in
- Transactional: "create task + schedule reminder" in a single DB transaction
- Separate worker process runs as a Coolify container

**Accepted downsides:** no built-in dashboard (pg-bossman optional), no native event-driven workflows (we orchestrate manually with `boss.send`).

### Hosting: Vercel vs self-hosted

**Chosen:** Coolify self-hosted (user requirement). Everything in Docker:
- App: Next standalone output (~50MB image)
- Worker: separate container, same `DATABASE_URL`
- Postgres: user-managed in Coolify
- TLS via Let's Encrypt (Coolify automatic)

## Consequences

**Positive:**
- Zero vendor lock-in
- Predictable costs (one self-hosted server)
- Homogeneous stack (everything on Postgres: app data + Better Auth sessions + pg-boss queue)
- Developers can work offline (local Postgres via Homebrew)

**Negative / watch:**
- Drizzle ecosystem younger than Prisma (less tooling, fewer tutorials)
- pg-boss always requires a worker process — trivial on Coolify, impossible on Vercel (not our target)
- Deferred realtime may create friction if an urgent use case appears in Phases 1–3 — revisit then

## Implementation notes

- All app-generated IDs use `nanoid(24)` (safe, URL-friendly, ~16 chars shorter than UUID)
- Timestamps: `timestamp { withTimezone: true, mode: "date" }` everywhere
- Rates as decimal: `numeric(12, 2)` stored as string in the app
- Soft delete via `deletedAt` on Task, Project, Client
- `session.activeOrganizationId` (from `organization` plugin) is the source of truth for the current workspace
