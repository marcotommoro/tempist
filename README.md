# Tempist

**Time tracker + task management** for freelancers and small studios. Log what you did, press Enter, send the invoice.

Always **free** (all plans, €0). **Open source** and **self-hostable** — your data stays on your server if you want.

**Repository:** [github.com/marcotommoro/tempist](https://github.com/marcotommoro/tempist)

## Features

- **Quick entry** — one line of text for clients, projects, durations, and priorities
- **Timer & timesheet** — live tracking, billable vs internal hours
- **Workspace** — multi-tenant with Better Auth (magic link, Google, GitHub)
- **Projects & tasks** — inbox, today, shared projects, and external invites
- **Reports & export** — CSV, print, analytics by period
- **Background jobs** — reminders, digest, calendar sync (pg-boss)
- **Self-host** — Docker standalone + worker, see [Coolify](docs/deployment/coolify.md) guide

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript strict
- Drizzle ORM + PostgreSQL · Better Auth · Tailwind 4 · shadcn/ui
- pg-boss · Resend · Vitest · Playwright · pnpm · Node 22

## Quick start

### Prerequisites

- Node 22 (`.nvmrc`), pnpm 11+
- Postgres 16+

### Setup

```bash
createdb todoist_dev
createdb todoist_test

cp .env.example .env.local
# DATABASE_URL, BETTER_AUTH_SECRET (>=32 char), BETTER_AUTH_URL=http://localhost:3000

pnpm install
pnpm db:migrate
pnpm db:seed   # optional
```

### Development

Run two processes in parallel:

```bash
pnpm dev          # http://localhost:3000
pnpm worker:dev   # pg-boss worker
```

## Self-host

Tempist is built to run on **your** infrastructure:

| Component | Role |
|---|---|
| `Dockerfile` | Next.js standalone (port 3000) |
| `Dockerfile.worker` | pg-boss worker |
| Postgres 16 | App + pg-boss queues |

Step-by-step guide: **[docs/deployment/coolify.md](docs/deployment/coolify.md)**.

Minimum production variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (public app URL). Optional: `RESEND_API_KEY`, Google/GitHub OAuth — see [.env.example](.env.example).

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm worker:dev` | pg-boss worker |
| `pnpm build` | Production build (standalone) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest |
| `pnpm test:e2e` | Playwright |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Demo data |

For architecture, auth, and domain layer conventions → **[AGENTS.md](AGENTS.md)**.

## Structure

```
app/           App Router (landing, auth, authenticated app)
components/    ui/ + features/
lib/           auth, db, domain, jobs, integrations
worker/        pg-boss entry
drizzle/       SQL migrations
tests/         unit, integration, e2e
docs/          deployment, architecture
```

## License

The code is public on GitHub; **license TBD** — check the `LICENSE` file in the repo before redistributing.

## Development

Roadmap and phase status: [PROGRESS.md](PROGRESS.md).
