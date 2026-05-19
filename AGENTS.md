<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> `CLAUDE.md` is a one-line `@AGENTS.md` import — keep substantive guidance in **this file** so Claude Code, Codex, and other agents share one source of truth.

## Stack

Next.js 16 (App Router, React 19) · TypeScript strict (`noUncheckedIndexedAccess`) · Tailwind 4 · Drizzle ORM + PostgreSQL · Better Auth (magic-link + organization plugin) · Resend (email) · pg-boss (background jobs) · Vitest (unit) + Playwright (E2E) · pnpm · Node 22.

## Common commands

```bash
pnpm dev               # Next dev server (localhost:3000)
pnpm worker:dev        # pg-boss worker (separate process, required for jobs)
pnpm build             # production build (output: standalone)

pnpm lint              # ESLint (flat config, eslint-config-next)
pnpm typecheck         # tsc --noEmit

pnpm test              # Vitest one-shot (tests/unit + tests/integration)
pnpm test:watch        # Vitest watch
pnpm test:e2e          # Playwright (serial, workers: 1)
pnpm test:e2e tests/e2e/projects.spec.ts          # single E2E file
npx playwright test -g "create a project"          # single E2E by name
npx playwright test --ui                           # Playwright UI

pnpm db:generate       # generate migration from lib/db/schema.ts
pnpm db:migrate        # apply pending migrations
pnpm db:push           # dev-only: push schema without migration
pnpm db:check          # verify schema/migration consistency
pnpm db:studio         # Drizzle Studio
pnpm db:seed           # run lib/db/seed.ts

pnpm auth:generate     # regenerate Better Auth types after auth config change
```

CI (`.github/workflows/ci.yml`) runs: `lint → typecheck → db:check → db:migrate → test → build` against a Postgres 16 service. Match it locally before pushing.

## Architecture

### Layered data flow

```
React component (Server or Client)
        │
        ▼
lib/actions/*.ts     ← "use server"; Zod-validate FormData/args; call requireActiveOrganization()
        │              or requireProjectAccess(); revalidatePath(); return ActionResult<T>
        ▼
lib/domain/*.ts      ← pure-ish business logic; takes organizationId explicitly; talks to DB via Drizzle
        │
        ▼
lib/db/schema.ts     ← Drizzle schema (single file, multi-tenant via organizationId on every app table)
```

**Never** call domain functions from client components, and **never** call Drizzle directly from components or actions — go through `lib/domain/*`. Actions are the only place that touches auth helpers + revalidation.

### Auth & access control

- `lib/auth/config.ts` — Better Auth setup (magicLink, organization, Drizzle adapter, Resend sender). `databaseHooks.user.create.after` auto-creates a personal organization on first signup.
- `lib/auth/workspace.ts` — `getSession()`, `requireSession()`, `requireActiveOrganization() → { user, organizationId, role }`.
- `lib/auth/project-access.ts` — `requireProjectAccess(projectId) → { user, project, accessType, role }`. Returns 404 (not 403) on denial to avoid leaking project existence. Workspace members get implicit `editor`; external users get a role from `projectMember`.

### App router

- `app/(app)/layout.tsx` is the auth wall — calls `requireActiveOrganization()` and loads sidebar context. All authed pages live under this group.
- `app/(auth)/` — public sign-in / verify-request.
- `app/invitations/workspace/[id]` (Better Auth flow) and `app/invitations/project/[token]` (custom token, see `projectInvitation` table) — **public** routes, do not put them behind the auth layout.
- `app/api/` — route handlers (auth callbacks, integrations, webhooks, `/api/ical/[token].ics`).

### Schema highlights (`lib/db/schema.ts`)

- **Better Auth tables**: `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`. **`organization` is the "Workspace" the UI shows** — keep the naming straight when reading/writing code.
- **Two parallel membership systems**:
  - `member` = workspace-level (Better Auth managed; mutate via `auth.api.*`, not direct SQL, so sessions stay in sync).
  - `projectMember` + `projectInvitation` = project-level, lets you invite users **outside the workspace** to a single project (7-day token expiry).
- **Soft-delete everywhere**: filter by `isNull(deletedAt)` on `project`, `client`, etc. Tasks use `completedAt` + `deletedAt`.
- **Multi-tenancy**: every app table carries `organizationId`. Forgetting it in a WHERE clause is the #1 way to leak data across workspaces.
- **Timestamps**: always `timestamp(..., { withTimezone: true, mode: "date" })`.

### Background jobs (pg-boss)

`lib/jobs/boss.ts` exposes `await getBoss()`; the worker process (`pnpm worker:dev` → `worker/index.ts`) registers handlers from `lib/jobs/definitions/*` (reminder-scan, calendar-sync, digest-daily, weekly-report, health-check). Actions enqueue via `boss.send(queueName, payload)`. The dev server alone won't process jobs — run the worker too.

### Email

Resend via `lib/integrations/email.ts`. Without `RESEND_API_KEY`, dev logs the email to stdout **and** writes magic links to `.e2e-magic-links/` for Playwright (see `tests/e2e/global-setup.ts` + `tests/e2e/helpers/auth.ts`).

### Components

- `components/ui/*` — shadcn-style Radix + Tailwind primitives. Don't reach for new UI libraries; extend these.
- `components/features/<domain>/*` — feature-colocated (projects, tasks, timer, workspaces, clients, filters, reports, command-palette, notifications, settings, pwa, sidebar). Prefer adding to an existing feature folder over making a new one.
- Forms: `react-hook-form` + Zod + Server Action. **No REST/JSON API layer** for app data — client submits FormData straight to actions.

## Non-obvious conventions / gotchas

1. **Workspace ≠ Organization in code.** UI says "Workspace"; schema/Better Auth says "organization". Don't rename to "match".
2. **Domain takes `organizationId` explicitly.** No implicit context lookups inside `lib/domain/*` — that's the action's job. Keeps domain testable and reusable from the worker.
3. **Workspace member mutations go through `auth.api.*`**, not raw Drizzle, so Better Auth keeps its caches/sessions consistent. Project member mutations are plain Drizzle (no Better Auth involvement).
4. **Actions return `ActionResult<T>`**, they don't throw to the client. Server-side guard failures (auth, access) use Next's `redirect()` / `notFound()`.
5. **Call `revalidatePath()` after mutations** — ISR won't refresh otherwise. Easy to forget on optimistic-UI flows.
6. **Italian in comments/seed data** (default locale `it`, TZ `Europe/Rome`). Match the surrounding language when adding comments to a file.
7. **Playwright is serial** (`workers: 1`, `fullyParallel: false`) because tests share one demo user and one test DB. Do not "fix" this without rebuilding fixtures.
8. **The Next.js docs in `node_modules/next/dist/docs/` are authoritative** for this version — APIs may differ from training data (see warning at top).

## Project-specific rules

<!-- Add your own enforceable rules here. Examples a future Claude instance can act on:
     - "Always run `pnpm lint && pnpm typecheck && pnpm test` before claiming work is done."
     - "Never edit files under drizzle/ by hand — always regenerate via db:generate."
     - "Prefer Server Components; only mark a component 'use client' if it needs state, effects, or browser APIs."
     - "When adding a feature: schema → domain → action → component → E2E test, in that order."
-->
