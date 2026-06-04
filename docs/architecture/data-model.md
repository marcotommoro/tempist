# Data model

**Source of truth:** `lib/db/schema.ts` (Drizzle, 25 tables).
**Migrations:** `drizzle/*.sql` (generate via `pnpm db:generate`).

## Conventions

- Multi-tenant: every application resource carries `organization_id` (FK to `organization.id`)
- "Workspace" is the UI term; in the DB the table is `organization` (Better Auth convention)
- All timestamps are UTC with timezone (`timestamp with time zone`); client-side TZ conversion via `User.timezone`
- Soft delete via `deleted_at` on: `task`, `project`, `client`
- App-generated IDs: nanoid(24) — `text("id").primaryKey().$defaultFn(() => nanoid(24))`
- Money amounts: `numeric(12, 2)` (represented as string in JS)

## Schema sections

### 1. Better Auth (auto-generated, maintained via `pnpm auth:generate`)

```
user                User account — with additionalFields {timezone, locale}
session             Session + activeOrganizationId (from org plugin)
account             OAuth or magic-link credential
verification        Magic link / OTP token
organization        UI "Workspace"
member              Org membership + role {owner|admin|member}
invitation          Pending invite
```

### 2. Task domain

```
project             Project (hierarchical via parent_id)
section             Project section
label               Workspace-wide label
task                Task (hierarchical, RRULE recurrence, P1–P4 priority)
task_label          M:N join task↔label
reminder            Reminder (TIME or RELATIVE, channels PUSH|EMAIL)
comment             Markdown comment with JSON attachments
filter              Saved filter with mini-DSL
```

### 3. Time tracker

```
client              Billing client with default rate
time_entry          Timer entry (frozen hourly_rate_snapshot)
billing_rate        Hierarchical rate (scope CLIENT|PROJECT|TASK|USER)
time_entry_audit    Audit log for time_entry changes
```

### 4. Integrations

```
calendar_account       Google/Outlook OAuth account (encrypted tokens)
calendar_event_link    Bidirectional task ↔ external event link
ical_token             Token for authenticated public iCal feed
webhook                Outbound webhook configured by the user
webhook_delivery       Webhook delivery log
```

### 5. Notifications

```
notification        In-app notification (nullable read_at)
```

## Critical indexes

```sql
-- "Today" / "Upcoming" queries
CREATE INDEX task_org_completed_scheduled_idx
  ON task (organization_id, completed_at, scheduled_at);

-- Timeline + time tracker reports
CREATE INDEX time_entry_org_user_started_idx
  ON time_entry (organization_id, user_id, started_at);

-- "One active timer per user" constraint (PARTIAL UNIQUE)
CREATE UNIQUE INDEX time_entry_one_running_per_user
  ON time_entry (user_id)
  WHERE is_running = true;

-- Per-client reports
CREATE INDEX time_entry_org_client_started_idx
  ON time_entry (organization_id, client_id, started_at);

-- Hierarchical rate lookup
CREATE INDEX billing_rate_org_scope_idx
  ON billing_rate (organization_id, scope, scope_id, effective_from);
```

## Rate snapshot (business rule)

When a `time_entry` is created (or stopped), the app resolves the rate via hierarchical fallback:

```
TASK rate → PROJECT rate → CLIENT rate → USER rate → workspace default
```

The resolved value is **frozen** in `time_entry.hourly_rate_snapshot` + `currency_snapshot`. Changing a client rate later does **not** recalculate historical entries.

## Audit trail

Every `INSERT`/`UPDATE`/`DELETE` on `time_entry` (except the initial INSERT) is logged in `time_entry_audit`:
- `actor_id`: who performed the operation
- `action`: `CREATE|UPDATE|DELETE|RESUME|STOP`
- `before_json` / `after_json`: state snapshots

Implemented at the application layer in Phase 2 (not via Postgres triggers) to stay aligned with Better Auth context (who is currentUser).
