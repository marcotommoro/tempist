/**
 * Todoist + Time Tracker — Drizzle schema (postgresql)
 *
 * Sections:
 *   1. Shared helpers (id, timestamps)
 *   2. Enums (pgEnum)
 *   3. Better Auth tables (user, session, account, verification, organization, member, invitation)
 *   4. Task domain         (project, section, label, task, task_label, reminder, comment, filter)
 *   5. Time tracker domain (client, time_entry, billing_rate, time_entry_audit)
 *   6. Integrations        (calendar_account, calendar_event_link, ical_token, webhook, webhook_delivery)
 *   7. Notifications       (notification)
 *
 * Multi-tenancy: ogni risorsa applicativa porta organizationId (FK organization.id).
 * "Workspace" e il termine UI; "Organization" e il termine schema (convenzione Better Auth).
 * pg-boss usa lo schema separato `pgboss.*` (gestito automaticamente da pg-boss).
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  varchar,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

// ============================================================================
// 1. Shared helpers
// ============================================================================

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => nanoid(24));

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

// ============================================================================
// 2. Enums
// ============================================================================

export const priorityEnum = pgEnum("priority", ["P1", "P2", "P3", "P4"]);
export const viewDefaultEnum = pgEnum("view_default", ["LIST", "BOARD", "CALENDAR"]);
export const reminderTriggerTypeEnum = pgEnum("reminder_trigger_type", ["TIME", "RELATIVE"]);
export const reminderChannelEnum = pgEnum("reminder_channel", ["PUSH", "EMAIL"]);
export const calendarProviderEnum = pgEnum("calendar_provider", ["GOOGLE", "OUTLOOK"]);
export const billingRateScopeEnum = pgEnum("billing_rate_scope", [
  "CLIENT",
  "PROJECT",
  "TASK",
  "USER",
]);
export const clientStatusEnum = pgEnum("client_status", ["ACTIVE", "ARCHIVED"]);

// ============================================================================
// 3. Better Auth tables
// Convenzione: i nomi tabella seguono Better Auth (singolare, lowercase).
// `npx @better-auth/cli generate --adapter drizzle` puo rigenerare/aggiornare
// queste tabelle quando Better Auth aggiunge feature.
// ============================================================================

export const user = pgTable(
  "user",
  {
    id: id(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    name: text("name"),
    image: text("image"),
    // additionalFields configurati in betterAuth({ user: { additionalFields: ... } })
    timezone: text("timezone").default("Europe/Rome").notNull(),
    locale: text("locale").default("it").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("user_email_unique").on(t.email)],
);

export const session = pgTable(
  "session",
  {
    id: id(),
    token: text("token").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // From organization plugin
    activeOrganizationId: text("active_organization_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("session_token_unique").on(t.token),
    index("session_user_id_idx").on(t.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: "date" }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("account_provider_account_unique").on(t.providerId, t.accountId),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const organization = pgTable(
  "organization",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug"),
    logo: text("logo"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("organization_slug_unique").on(t.slug)],
);

export const member = pgTable(
  "member",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("member_org_user_unique").on(t.organizationId, t.userId),
    index("member_user_id_idx").on(t.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("invitation_organization_id_idx").on(t.organizationId),
    index("invitation_email_idx").on(t.email),
  ],
);

// ============================================================================
// 4. Task domain
// ============================================================================

export const project = pgTable(
  "project",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#808080").notNull(),
    icon: text("icon"),
    viewDefault: viewDefaultEnum("view_default").default("LIST").notNull(),
    parentId: text("parent_id").references((): import("drizzle-orm/pg-core").AnyPgColumn => project.id, {
      onDelete: "set null",
    }),
    clientId: text("client_id").references((): import("drizzle-orm/pg-core").AnyPgColumn => client.id, {
      onDelete: "set null",
    }),
    isFavorite: boolean("is_favorite").default(false).notNull(),
    order: integer("order").default(0).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("project_organization_id_idx").on(t.organizationId),
    index("project_org_client_idx").on(t.organizationId, t.clientId),
    index("project_parent_id_idx").on(t.parentId),
  ],
);

export const section = pgTable(
  "section",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: integer("order").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("section_project_id_idx").on(t.projectId)],
);

export const label = pgTable(
  "label",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#808080").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("label_org_name_unique").on(t.organizationId, t.name)],
);

export const task = pgTable(
  "task",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, { onDelete: "set null" }),
    sectionId: text("section_id").references(() => section.id, { onDelete: "set null" }),
    parentId: text("parent_id").references((): import("drizzle-orm/pg-core").AnyPgColumn => task.id, {
      onDelete: "set null",
    }),
    clientId: text("client_id").references((): import("drizzle-orm/pg-core").AnyPgColumn => client.id, {
      onDelete: "set null",
    }),
    assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    descriptionMarkdown: text("description_markdown"),
    priority: priorityEnum("priority").default("P4").notNull(),

    // scheduledAt = quando l'utente vuole lavorarci (datetime con tz client-side)
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "date" }),
    // dueDate = la deadline assoluta (giorno)
    dueDate: date("due_date", { mode: "date" }),
    estimatedMinutes: integer("estimated_minutes"),

    // RRULE iCalendar standard, es: "FREQ=DAILY;BYHOUR=9"
    recurrenceRule: text("recurrence_rule"),

    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    order: integer("order").default(0).notNull(),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("task_org_completed_scheduled_idx").on(t.organizationId, t.completedAt, t.scheduledAt),
    index("task_org_project_section_idx").on(t.organizationId, t.projectId, t.sectionId, t.order),
    index("task_org_client_idx").on(t.organizationId, t.clientId),
    index("task_assignee_idx").on(t.assigneeId),
    index("task_parent_idx").on(t.parentId),
  ],
);

export const taskLabel = pgTable(
  "task_label",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => label.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.labelId] })],
);

export const reminder = pgTable(
  "reminder",
  {
    id: id(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    triggerType: reminderTriggerTypeEnum("trigger_type").notNull(),
    // Per TIME: ISO datetime UTC. Per RELATIVE: stringa tipo "-1h", "-1d 09:00"
    triggerValue: text("trigger_value").notNull(),
    channels: reminderChannelEnum("channels").array().default(sql`ARRAY['PUSH']::reminder_channel[]`).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("reminder_task_idx").on(t.taskId),
    index("reminder_sent_at_idx").on(t.sentAt),
  ],
);

export const comment = pgTable(
  "comment",
  {
    id: id(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bodyMarkdown: text("body_markdown").notNull(),
    attachments: jsonb("attachments"), // [{url, name, mimeType, sizeBytes}]
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("comment_task_idx").on(t.taskId)],
);

export const filter = pgTable(
  "filter",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Mini DSL: "priority:1 AND (client:Acme OR @urgent) AND due:7d"
    queryDsl: text("query_dsl").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("filter_org_user_idx").on(t.organizationId, t.userId)],
);

// ============================================================================
// 5. Time tracker domain
// ============================================================================

export const client = pgTable(
  "client",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    vatNumber: text("vat_number"),
    address: text("address"),
    currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
    hourlyRateDefault: numeric("hourly_rate_default", { precision: 12, scale: 2 }),
    color: text("color").default("#808080").notNull(),
    status: clientStatusEnum("status").default("ACTIVE").notNull(),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("client_org_status_idx").on(t.organizationId, t.status)],
);

export const timeEntry = pgTable(
  "time_entry",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => client.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => project.id, { onDelete: "set null" }),
    taskId: text("task_id").references(() => task.id, { onDelete: "set null" }),

    description: text("description"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    // durationSeconds: computed in app at write time (endedAt - startedAt).
    durationSeconds: integer("duration_seconds"),

    isBillable: boolean("is_billable").default(true).notNull(),
    // Tariffa congelata al momento del tracking. Cambiare la tariffa cliente in futuro
    // NON ricalcola retroattivamente questo valore.
    hourlyRateSnapshot: numeric("hourly_rate_snapshot", { precision: 12, scale: 2 }),
    currencySnapshot: varchar("currency_snapshot", { length: 3 }),

    tags: jsonb("tags"), // string[]
    isRunning: boolean("is_running").default(false).notNull(),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("time_entry_org_user_started_idx").on(t.organizationId, t.userId, t.startedAt),
    index("time_entry_org_client_started_idx").on(t.organizationId, t.clientId, t.startedAt),
    index("time_entry_task_idx").on(t.taskId),
    // Partial unique: solo UN timer running per utente
    uniqueIndex("time_entry_one_running_per_user")
      .on(t.userId)
      .where(sql`is_running = true`),
  ],
);

export const billingRate = pgTable(
  "billing_rate",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    scope: billingRateScopeEnum("scope").notNull(),
    // scopeId punta a client.id, project.id, task.id o user.id a seconda di scope.
    // Soft-FK (nessun vincolo DB) per supportare i 4 tipi senza inheritance complessa.
    scopeId: text("scope_id"),
    value: numeric("value", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("billing_rate_org_scope_idx").on(t.organizationId, t.scope, t.scopeId, t.effectiveFrom),
  ],
);

export const timeEntryAudit = pgTable(
  "time_entry_audit",
  {
    id: id(),
    timeEntryId: text("time_entry_id")
      .notNull()
      .references(() => timeEntry.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // CREATE | UPDATE | DELETE | RESUME | STOP
    action: text("action").notNull(),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    at: timestamp("at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("time_entry_audit_time_entry_idx").on(t.timeEntryId),
    index("time_entry_audit_actor_idx").on(t.actorId),
  ],
);

// ============================================================================
// 6. Integrations
// ============================================================================

export const calendarAccount = pgTable(
  "calendar_account",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: calendarProviderEnum("provider").notNull(),
    externalAccountId: text("external_account_id").notNull(),
    // Token cifrati at-rest (cifratura applicata a livello applicativo con TOKEN_ENCRYPTION_KEY)
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    // Per Google Calendar push: channel watch
    watchChannelId: text("watch_channel_id"),
    watchResourceId: text("watch_resource_id"),
    watchExpiresAt: timestamp("watch_expires_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("calendar_account_user_provider_unique").on(t.userId, t.provider, t.externalAccountId),
    index("calendar_account_organization_id_idx").on(t.organizationId),
  ],
);

export const calendarEventLink = pgTable(
  "calendar_event_link",
  {
    id: id(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    calendarAccountId: text("calendar_account_id")
      .notNull()
      .references(() => calendarAccount.id, { onDelete: "cascade" }),
    externalEventId: text("external_event_id").notNull(),
    etag: text("etag"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("calendar_event_link_account_event_unique").on(t.calendarAccountId, t.externalEventId),
    index("calendar_event_link_task_idx").on(t.taskId),
  ],
);

export const icalToken = pgTable(
  "ical_token",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Token random (32 byte hex) usato in URL: /api/ical/<token>.ics
    token: text("token").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ical_token_token_unique").on(t.token),
    index("ical_token_user_idx").on(t.userId),
  ],
);

export const webhook = pgTable(
  "webhook",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    // ["task.created", "task.completed", "time_entry.stopped", ...]
    eventTypes: jsonb("event_types").notNull(),
    secret: text("secret").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("webhook_organization_id_idx").on(t.organizationId)],
);

export const webhookDelivery = pgTable(
  "webhook_delivery",
  {
    id: id(),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhook.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    statusCode: integer("status_code"),
    attempts: integer("attempts").default(0).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("webhook_delivery_webhook_created_idx").on(t.webhookId, t.createdAt)],
);

// ============================================================================
// 7. Notifications
// ============================================================================

export const notification = pgTable(
  "notification",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // "task.assigned" | "task.due_soon" | "comment.mentioned" | "budget.alert" | ...
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  (t) => [index("notification_user_read_created_idx").on(t.userId, t.readAt, t.createdAt)],
);

// ============================================================================
// Type exports — utili per inferenza nei query/insert
// ============================================================================

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type Section = typeof section.$inferSelect;
export type NewSection = typeof section.$inferInsert;
export type Label = typeof label.$inferSelect;
export type NewLabel = typeof label.$inferInsert;
export type Task = typeof task.$inferSelect;
export type NewTask = typeof task.$inferInsert;
export type TimeEntry = typeof timeEntry.$inferSelect;
export type NewTimeEntry = typeof timeEntry.$inferInsert;
export type Client = typeof client.$inferSelect;
export type NewClient = typeof client.$inferInsert;
export type Filter = typeof filter.$inferSelect;
export type NewFilter = typeof filter.$inferInsert;
export type Notification = typeof notification.$inferSelect;
export type NewNotification = typeof notification.$inferInsert;
