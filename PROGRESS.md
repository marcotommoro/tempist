# Progress

## Feature pack — Task detail dialog + Calendar picker + Comments + Due date + Completed visible ✅

**Date:** 2026-05-18

### What was done

- [x] **Proper date picker** — replaced `<input type="datetime-local">` with shadcn `Calendar` (react-day-picker v10). New reusable primitives `<DateTimePicker>` and `<DatePicker>` in `components/ui/`.
- [x] **Completed tasks visible on the day** — removed `isNull(completedAt)` from `getInboxTasks` and `getUpcomingTasks`. `getTodayTasks` now includes today's completed tasks (filter `completedAt IS NULL OR scheduledAt >= startUtc`). `TaskList` sorts completed to the bottom.
- [x] **Task description** — `<TaskDescriptionEditor>` with view ↔ edit toggle, shadcn `Textarea` + `<Markdown>` (react-markdown, safe HTML escape by default).
- [x] **Task comments** — `lib/domain/comments.ts` (getCommentsByTaskId, getCommentCountByTask, createComment, deleteComment author-only). `lib/actions/comments.ts` (createCommentAction, deleteCommentAction, fetchTaskCommentsAction). `<TaskCommentsSection>` with avatar + timestamp + optimistic update via `useOptimistic`. "💬 N" badge on TaskItem.
- [x] **Due date separate from Date** — `task.dueDate` exposed in TaskDetailDialog sidebar (`<DatePicker>` date-only). Amber pill "Due DD MMM" on TaskItem next to Date.
- [x] **Task detail dialog** — `<TaskDetailDialog>` (two-column modal) opens when clicking the task title. Contains: checkbox + inline editable title, description, comments, sidebar (Project, Date, Due, Priority). Loads comments lazily on open via Server Action.
- [x] **Priority editing** — `<TaskPrioritySelect>` Popover P1/P2/P3/P4 with colors, saves via new `setTaskPriorityAction`.

### New files

```
components/ui/calendar.tsx          (shadcn install)
components/ui/textarea.tsx          (shadcn install)
components/ui/date-picker.tsx       (composed)
components/ui/date-time-picker.tsx  (composed: Calendar + time input)
components/features/tasks/task-detail-dialog.tsx
components/features/tasks/task-description-editor.tsx
components/features/tasks/task-comments-section.tsx
components/features/tasks/task-priority-select.tsx
lib/domain/comments.ts
lib/actions/comments.ts
lib/utils/markdown.tsx
```

### Modified files

- `lib/db/schema.ts` — exported `Comment` type
- `lib/domain/tasks.ts` — Today/Inbox/Upcoming queries include completed; added `updateTaskDescription`, `updateTaskPriority`, `updateTaskTitle`
- `lib/actions/tasks.ts` — added `setTaskDescriptionAction`, `setTaskPriorityAction`, `setTaskTitleAction`
- `components/features/tasks/task-item.tsx` — title click → opens dialog; Due pill; comment badge
- `components/features/tasks/task-list.tsx` — sort completed to bottom; passthrough commentsByTask/projectsById/currentUserId
- `components/features/tasks/task-schedule-picker.tsx` — datetime-local → DateTimePicker
- `components/features/timer/global-manual-entry-dialog.tsx` — date input → DatePicker
- `components/features/upcoming/overdue-section.tsx` — passthrough new props
- 4 pages (today, inbox, upcoming, projects/[id]) — fetch `getCommentCountByTask` + `listProjects` for metadata

### Dependencies added

```
react-day-picker 10.0.1
react-markdown 10.1.0
isomorphic-dompurify 3.13.0  (reserved — unused; react-markdown is safe by default without rehype-raw)
```

### Security decisions

- `react-markdown` does not enable raw HTML (no `rehype-raw`): output sanitized by default. Sufficient for description and comments.
- Multi-tenancy guard on `createComment` and all queries: task must belong to `activeOrganizationId`.
- `deleteComment` author-only via SQL: `WHERE author_id = currentUserId`.

### Verification

- ✅ `pnpm typecheck` clean
- ✅ `pnpm lint` clean
- ✅ `pnpm test` 106/106
- ✅ `pnpm build` 21 routes (was 19)

### Notes

- Subtasks, inline labels, and reminders in the dialog sidebar **out of scope** for this pack.
- shadcn calendar install had an invalid `table` key in react-day-picker v10 → patched to `month_grid` in `components/ui/calendar.tsx`.

---

## Phase 0 — Setup ✅ (nearly complete)

**Date:** 2026-05-15

### What was done

- [x] **0.1** Bootstrap Next.js 16 + TypeScript strict (with `noUncheckedIndexedAccess`)
- [x] **0.2** Local Postgres via Homebrew + documented `.env.example`
- [x] **0.3** Drizzle ORM + full schema (25 tables: 7 Better Auth + 18 app)
- [x] **0.4** Better Auth (magic link + Google + GitHub + organization plugin) with post-signup hook
- [x] **0.5** App layout + shadcn/ui base (button, input, dialog, dropdown-menu, sheet, tabs, popover, separator, avatar, badge, sonner)
- [x] **0.6** pg-boss singleton + worker entry + dummy `health-check` job
- [x] **0.7** Vitest + Playwright + 1 unit test + 1 integration placeholder + 1 E2E smoke
- [x] **0.8** GitHub Actions CI (lint, typecheck, db migrate, test, build on Postgres service)
- [x] **0.9** Bootstrap documentation (README + ADR 0001 + data-model.md + coolify.md)
- [x] **0.10** Production Dockerfile (Next standalone) + Dockerfile.worker + .dockerignore

### Decisions made along the way

1. **Prisma → Drizzle.** Initial plan used Prisma 7. Drizzle chosen for: native partial unique indexes (useful for "one running timer per user"), type inference without a generation step, decimal-as-string avoids precision loss on rates. DB stack now: `drizzle-orm` + `drizzle-kit` + `pg` (node-postgres).
2. **Production hosting = Coolify self-hosted.** User manages the server (including Postgres). Multistage Dockerfile with Next 16 `output: 'standalone'` → ~50MB image. pg-boss worker in a separate container.
3. **Realtime deferred to Phase 4.** Phases 1–3 are enough with TanStack Query polling. Revisit when cross-device timer / live notifications become concrete.
4. **shadcn/ui manual setup.** Init CLI went interactive — wrote `components.json` directly and added primitives via `shadcn@latest add`. All healthy.

### Explicitly deferred decisions

| Item | When | Why |
|---|---|---|
| Realtime provider (LISTEN/NOTIFY, Electric, Ably) | Phase 4 | Polling enough for Phases 1–3 |
| File storage (S3 vs MinIO self-hosted on Coolify) | Phase 1 (comments+attachments) | Likely MinIO for self-hosted consistency |
| Charting (Recharts vs Tremor) | Phase 5 (reports) | After design |
| Analytics (PostHog vs Plausible) | Phase 6 (polish) | Not blocking |
| Web Push notifications | Phase 4 | Requires real HTTPS |

### Phase 0 end-to-end verification

- ✅ `pnpm typecheck` → zero errors
- ✅ `pnpm test` → 6 tests passed (2 files)
- ✅ `pnpm db:generate` → migration SQL produced correctly (25 tables, partial unique index included)
- ⏳ `pnpm build` → run with valid env vars (needs real `DATABASE_URL` but can run with placeholder)
- ⏳ Manual smoke (magic link signup → /today)
- ⏳ Production Docker build
- ⏳ Coolify deploy

### Next steps

→ **Phase 3 — Task ↔ Timer integration + linking UI.**

## Phase 6 — Polish ✅

**Date:** 2026-05-18

### Iterations completed

- **6.1** Dark mode (next-themes)
  * ThemeProvider in providers.tsx (attribute=class, system default)
  * Compact ThemeSwitcher in topbar (cycle light→dark→system)
  * ThemeSection radio in /settings
  * `lib/hooks/use-is-client.ts`: useSyncExternalStore to avoid hydration mismatch
    without violating the `react-hooks/set-state-in-effect` rule
- **6.2** Command palette (cmdk)
  * Global Cmd+K / Ctrl+K listener
  * Debounced search (150ms) on task/project/client via PostgreSQL ILIKE
  * Quick navigation to all main views
  * CommandDialog extended with sr-only title/description for Radix a11y
- **6.3** PWA (manifest + service worker)
  * `public/manifest.webmanifest` installable, theme colors, shortcuts
  * `public/icon.svg` 512x512 (PNG raster to generate for Lighthouse 100)
  * `public/sw.js`: cache-first for static, network-first for HTML, bypass API
  * ServiceWorkerRegister only in NODE_ENV=production
  * Metadata + Viewport with dark/light themeColor + appleWebApp config
- **6.4** Todoist + Toggl CSV import
  * RFC 4180 parser in `lib/utils/csv-parse.ts` (~80 lines, no deps)
  * Auto-detect source from headers (`detectCsvSource` in lib/utils)
  * importTodoistTasks: PRIORITY 4→P1 (Todoist inverted), CONTENT→title, DUE→scheduledAt
  * importTogglTimeEntries: match client/project by name (no auto-create)
  * Per-row errors caught, continue on others
  * ImportSection in /settings with file upload max 5MB
- **6.5** A11y pass
  * Skip link "Skip to content" visible on focus
  * `aria-current="page"` on active SidebarLink (dedicated client component)
  * `aria-label` on nav landmarks (sidebar/main nav/workspace/tools)
  * `id="main-content"` + `tabIndex={-1}` on `<main>` for skip target
  * Existing review: icon buttons have aria-label, form inputs have Label

### Phase 6 test coverage

- **106 unit tests** green (was 94 at end of Phase 5) — +12 tests
  * 8 csv-parse (RFC 4180 edge cases)
  * 4 import-detect (Todoist/Toggl/unknown)
- `pnpm typecheck` zero errors, `pnpm lint` zero warnings, `pnpm build` 19 routes

### Decisions along the way

- **Web Push (4.6) confirmed skipped** in Phase 6 too: in-app notifications +
  email digest + weekly report cover the use cases. VAPID setup in a future
  phase when stable real HTTPS exists.
- **SVG icon instead of PNG raster** for PWA: covers installation flow but
  loses 5–10 Lighthouse PWA points. Generate 192/512 PNG when final design
  is available (with `sharp` or external tool).
- **Custom CSV parser** instead of papaparse: zero deps, ~80 lines for
  RFC 4180. If ISO-8859-1 or looser quoting appears later, migrate to papaparse.
- **A11y baseline reached** but not audited with axe-core CLI (ideal in CI).
  Skip link + aria-current + landmark labels cover the highest-impact screen reader fixes.
  Follow-up PR: full focus-visible review.

## Phase 5 — Reports & Analytics ✅

**Date:** 2026-05-18

### Iterations completed

- **5.1** Analytics domain
  * `getHoursByDay` (TO_CHAR group by day)
  * `getProjectBreakdown` (hours + entries + billable per project)
  * `getCompletedTasksByDay` (completed count)
  * `getTasksByPriority` (open vs completed per P1..P4)
  * `getOpenTasksByLabel` (open task count with label)
- **5.2** Charts dashboard `/reports` with Recharts 3.8.1
  * `HoursByDayChart` (BarChart) + `ClientPieChart` (PieChart)
  * `computeReportRange` (week/last-week/month, tz-aware) + pure `fillDailyGaps`
  * 3-option RangeToggle
- **5.3** CSV export time entries
  * `lib/utils/csv.ts` RFC 4180 builder (UTF-8 BOM for Excel on Windows, CRLF, escape)
  * GET `/api/reports/time-entries.csv?range=...` (13 columns, optional clientId/projectId)
- **5.4** Print-friendly report page
  * `app/(print)/` route group with layout without sidebar
  * `/reports/print?range=...` optimized for Cmd+P → Save as PDF
  * `print:hidden` + `break-inside-avoid` for clean layout
- **5.5** Scheduled weekly report
  * `lib/domain/weekly-report.ts` + `lib/utils/weekly-report-render.ts` (pure)
  * Global hourly cron `weekly.report`, filters internally for Monday 08:00 user tz
  * Dedupe via `Weekly:` notification created today in local tz
  * `/settings` WeeklyReportSection with "Send test report now"

### Phase 5 test coverage

- **94 unit tests** green (was 79 at end of Phase 4) — +15 tests
  * 5 csv (escape, BOM, Date, boolean)
  * 5 report-range (week/month/last-week + tz, fillDailyGaps)
  * 5 weekly-report-render (text + html, XSS escape)
- `pnpm typecheck` zero errors, `pnpm lint` zero warnings, `pnpm build` 19 routes
  (4 new: `/reports/print`, `/api/reports/time-entries.csv`, `(print)` route group)

### Decisions along the way

- **Recharts 3.x** instead of Tremor: smaller bundle, more stable API, swappable
  after design without a large refactor (similar component API).
- **PDF via "HTML print"** instead of server-side generator: zero deps, covers 80%
  of the value. Server PDF (puppeteer / @react-pdf) in a future phase if scheduled
  email PDF is needed.
- **`(print)` route group** instead of `print:hidden` on the sidebar: cleaner
  architecture, avoids "turning off" elements screen readers still see on printable versions.

## Phase 4 — Calendar & Notifications ✅ (partial: 4.6 Web Push skipped per user request)

**Date:** 2026-05-18

### Iterations completed

- **4.1** In-app notifications
  * Domain + 3 server actions, topbar bell with unread badge + popover
  * Real triggers from jobs (4.2, 4.4)
- **4.2** Reminder system + pg-boss scan job
  * `parseRelativeOffset` + `computeTriggerTime` (pure, tested)
  * Notation: `-30m`, `-1h`, `-1d`, `-1w` (`+` for after scheduledAt)
  * `findDueReminders` + `fireReminder` with atomic claim (UPDATE...WHERE sent_at IS NULL)
  * Worker cron `* * * * *`; notifications of type `reminder.fired`
  * UI: `TaskReminderButton` popover (relative presets + datetime picker)
  * `getPendingReminderCountByTask` aggregate, badge on tasks
- **4.3** iCal feed (read-only)
  * Pure RFC 5545 `lib/utils/ics.ts` (escape, fold, CRLF, status:completed)
  * Random 24-byte hex token (192-bit entropy), revocable
  * Public endpoint `/api/ical/[token]` with `text/calendar`
  * `/settings` IcalSection with generate/copy/revoke
- **4.4** Daily email digest
  * `lib/integrations/email.ts` Resend wrapper with dev console fallback
  * Pure renderers (text + html) testable in isolation
  * `processDailyDigest`: local time check + dedupe via "Digest:" notification
  * Global cron `0 * * * *`, filters 08:00 user-tz internally
  * `/settings` DigestSection with "Send test digest"
- **4.5** Google Calendar OAuth + push-only sync
  * AES-256-GCM with key from BETTER_AUTH_SECRET via scrypt
  * Tokens encrypted at rest; access token refresh on-demand 60s margin
  * OAuth: `/connect` redirect, `/callback` exchange (state = userId|orgId)
  * Cron `*/5 * * * *` push sync: INSERT/PATCH/DELETE primary calendar events
  * `calendar_event_link` binds task ↔ external event
  * UI `/settings` CalendarSection with connect (disabled if env missing) + disconnect
- **4.6** Web Push — **skipped** (user choice)
  * Notifications remain in-app + email digest. Consider in Phase 6.

### Phase 4 test coverage

- **79 unit tests** green (was 53 at end of Phase 3) — +26 tests
  * 13 reminder-time
  * 6 ics
  * 3 digest-render
  * 4 encryption
- `pnpm typecheck` zero errors, `pnpm lint` zero warnings, `pnpm build` 19 routes
  (3 new APIs: /api/ical/[token], /api/integrations/google-calendar/{connect,callback})

### Decisions along the way

- **Push-only calendar sync** instead of bidirectional: reduced scope from ~600 to ~250
  lines, user choice. Pull (event → task) in a future phase when MVP runs in production
  and there is a real copy-back use case.
- **Web Push skipped**: requires VAPID keys + real HTTPS, low incremental value vs
  in-app + email. Deferred.
- **Email helper extracted** to `lib/integrations/email.ts` for consistency between magic
  link and digest (partial DRY — config.ts keeps colored dev banner).
- **"Pure utils + impure domain" pattern** consolidated: `today-bounds`, `reminder-time`,
  `ics`, `digest-render`, `encryption` are all pure and tested in isolation.

## Phase 3 — Task ↔ Timer integration ✅

**Date:** 2026-05-18

### Iterations completed

- **3.1** `getTrackedSecondsByTask` aggregate
  * Single GROUP BY → `Map<taskId, seconds>` for O(1) lookup
  * Excludes `isRunning = true` (live duration is in the widget)
  * `getClientAggregates` for the dashboard (totals per client with billable amount)
- **3.2** Estimate vs tracked progress bar on TaskItem
  * `TaskProgress` component: bar with `over` state (>100%) or standalone text when no estimate
  * All task-oriented pages (today/inbox/upcoming/filters/projects) fetch and pass the aggregate
- **3.3** Duration prompt on complete (Dialog)
  * `CompleteWithDurationDialog`: opens only if `estimatedMinutes > 0` && `trackedSeconds === 0`
  * Confirm → retroactive manual entry linked to task/project/client, then toggle complete
  * Skip → toggle complete without entry
- **3.4** Tasks linked to client on `/clients/[id]`
  * `getTasksForClient` (only direct `task.clientId` — tasks via project appear on project page)
  * "Tasks" section above Time entries with the same progress bar
- **3.5** Report dashboard `/reports`
  * `getCompletedTaskCountByClient` aggregate by clientId
  * Week/month TZ-aware filter (`fromZonedTime + startOfWeek`)
  * Per-client table: completed tasks, hours, entries, billable (split totals by currency)

### Refactor along the way

- Extracted `todayBoundsUtc` to `lib/utils/today-bounds.ts` (pure function, no `db` import) — unit test no longer needs `DATABASE_URL` to run in isolation.

### Phase 3 test coverage

- **53 unit tests** green (same as Phase 2, no new unit tests because new logic is UI/component)
- `pnpm typecheck` zero errors, `pnpm lint` zero warnings, `pnpm build` 16 routes (`/reports` now dynamic)

## Phase 2 — Time tracking core ✅

**Date:** 2026-05-18

### Iterations completed

- **2.1** Clients CRUD
  * `lib/domain/clients.ts` + `lib/actions/clients.ts` (4 actions with Zod)
  * `/clients` list + create, `/clients/[id]` detail
- **2.2** Timer core + topbar widget
  * `startTimer` (captures unique violation 23505 from DB-level partial index)
  * `stopTimer` with computed `durationSeconds`
  * Timer widget live tick 1s (Server Component + Client Component)
- **2.3** TimeEntry list + retroactive manual entry
  * `/clients/[id]` shows stats (hours, billable, # entries) + retroactive form
  * `TimeEntryRow` with rate snapshot×hours and billable indicator
- **2.4** Hierarchical billing rates
  * `lib/domain/billing.ts` resolver with cascade TASK→PROJECT→CLIENT(+default)→USER
  * Rich snapshot at tracking time (passes all scopes to resolver)
  * `createBillingRate` immutable (history preserved)
- **2.5** Timer from task + audit log
  * `startTimerFromTask` inherits clientId/projectId/title
  * Play button on TaskItem (hover)
  * Audit log on CREATE and STOP (DELETE limited by cascade FK, TODO migration)
- **2.6** Verification tests
  * +9 new unit tests (durationSeconds + cascade order invariant)
  * Green build (15 routes, +2 vs Phase 1: /clients, /clients/[id])

### Phase 2 test coverage

- **53 unit tests** green (was 44 at end of Phase 1)
- typecheck/lint zero issues, green build

## Phase 1 — Task management core ✅

**Date:** 2026-05-18

### Iterations completed

- **1.1** Real task CRUD on Today/Inbox/Upcoming
  * `lib/domain/tasks.ts` + `lib/actions/tasks.ts` + TaskList/TaskItem/QuickAdd components
  * TZ-aware `todayBoundsUtc` (Europe/Rome / NY / UTC test coverage)
- **1.2** Quick Add NLP
  * `lib/parsers/quick-add.ts`: chrono-node + tokens `#proj @label p1..p4 !client:X 60min`
  * Resolve names→IDs: project/client REQUIRE existence; label AUTO-CREATE
  * Live preview colored chips
- **1.3** Projects + Sections CRUD
  * Domain + 7 server actions
  * Dynamic sidebar (favorites + projects list)
  * `/projects` list, `/projects/[id]` detail with sections
- **1.4** Labels + Filter DSL
  * Parser `priority:P1 @urgent due:7d is:open` (AND-only)
  * Executor with INNER JOIN+HAVING for label-AND
  * Saved filters CRUD + `/filters/[id]` view
- **1.5** Kanban board (@dnd-kit)
  * Drag-and-drop cross-column + reorder within
  * List | Board toggle on `/projects/[id]?view=board`
  * `moveTaskAction` in transaction (reassign order for entire column)
- **1.6** Recurring tasks (RRULE)
  * `lib/parsers/recurrence.ts` IT/EN keywords + RRULE pass-through
  * `computeNextOccurrence` with DTSTART anchoring
  * `toggleTaskComplete` spawns next occurrence
  * Quick Add extended: `repeats:every monday`

### Phase 1 test coverage

- **44 unit tests** green (was 11 at end of Phase 0)
  * 13 quick-add NLP parser
  * 5 today-bounds TZ
  * 9 filter-dsl
  * 9 recurrence
  * 6 format-duration + 2 placeholder integration
- `pnpm typecheck` zero errors, `pnpm lint` zero warnings, `pnpm build` 15 routes
