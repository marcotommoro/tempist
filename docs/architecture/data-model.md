# Data model

**Source of truth:** `lib/db/schema.ts` (Drizzle, 25 tabelle).
**Migrations:** `drizzle/*.sql` (generate via `pnpm db:generate`).

## Convenzioni

- Multi-tenant: ogni risorsa applicativa porta `organization_id` (FK a `organization.id`)
- "Workspace" è il termine UI; nel DB la tabella è `organization` (convenzione Better Auth)
- Tutti i timestamp sono UTC con timezone (`timestamp with time zone`), conversione tz lato client tramite `User.timezone`
- Soft delete via `deleted_at` su: `task`, `project`, `client`
- ID app-generated: nanoid(24) — `text("id").primaryKey().$defaultFn(() => nanoid(24))`
- Decimal per importi monetari: `numeric(12, 2)` (rappresentato come string lato JS)

## Sezioni dello schema

### 1. Better Auth (auto-generate, mantenuti via `pnpm auth:generate`)

```
user                Account utente — con additionalFields {timezone, locale}
session             Sessione + activeOrganizationId (da org plugin)
account             Credenziale OAuth o magic-link
verification        Token magic link / OTP
organization        "Workspace" UI
member              Membership org + ruolo {owner|admin|member}
invitation          Invito pending
```

### 2. Task domain

```
project             Progetto (gerarchico via parent_id)
section             Sezione del progetto
label               Etichetta workspace-wide
task                Task (gerarchico, RRULE recurrence, P1-P4 priority)
task_label          Join M:N task↔label
reminder            Promemoria (TIME o RELATIVE, channels PUSH|EMAIL)
comment             Commento markdown con attachments JSON
filter              Filtro salvato con mini-DSL
```

### 3. Time tracker

```
client              Cliente di fatturazione con tariffa default
time_entry          Voce timer (con hourly_rate_snapshot congelato)
billing_rate        Tariffa gerarchica (scope CLIENT|PROJECT|TASK|USER)
time_entry_audit    Audit log su modifiche time_entry
```

### 4. Integrations

```
calendar_account       OAuth account Google/Outlook (token cifrati)
calendar_event_link    Link bidirezionale task ↔ external event
ical_token             Token per iCal feed pubblico autenticato
webhook                Webhook in uscita configurato dall'utente
webhook_delivery       Log delivery dei webhook
```

### 5. Notifications

```
notification        Notifica in-app (read_at nullable)
```

## Indici critici

```sql
-- Query "Today" / "Upcoming"
CREATE INDEX task_org_completed_scheduled_idx
  ON task (organization_id, completed_at, scheduled_at);

-- Timeline + report time tracker
CREATE INDEX time_entry_org_user_started_idx
  ON time_entry (organization_id, user_id, started_at);

-- Vincolo "un timer attivo per utente" (PARTIAL UNIQUE)
CREATE UNIQUE INDEX time_entry_one_running_per_user
  ON time_entry (user_id)
  WHERE is_running = true;

-- Report per cliente
CREATE INDEX time_entry_org_client_started_idx
  ON time_entry (organization_id, client_id, started_at);

-- Lookup tariffe gerarchiche
CREATE INDEX billing_rate_org_scope_idx
  ON billing_rate (organization_id, scope, scope_id, effective_from);
```

## Snapshot tariffa (regola business)

Quando un `time_entry` viene creato (o stoppato), l'app risolve la tariffa via fallback gerarchico:

```
TASK rate → PROJECT rate → CLIENT rate → USER rate → workspace default
```

Il valore risolto viene **congelato** in `time_entry.hourly_rate_snapshot` + `currency_snapshot`. Modificare la tariffa cliente in futuro **non** ricalcola le voci storiche.

## Audit trail

Ogni `INSERT`/`UPDATE`/`DELETE` su `time_entry` (escluso INSERT iniziale) viene loggato in `time_entry_audit`:
- `actor_id`: chi ha fatto l'operazione
- `action`: `CREATE|UPDATE|DELETE|RESUME|STOP`
- `before_json` / `after_json`: snapshot stato

Implementato a livello applicativo in Fase 2 (non via trigger Postgres) per mantenere coerenza con il contesto Better Auth (chi è il currentUser).
