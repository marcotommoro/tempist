# Collaboration v1 — Design Spec

Status: approved 2026-05-19.

## Context

The todoist app is a multi-tenant Todoist + time-tracker built for teams (workspaces with members, project-level invitations, comments, notifications). Three collaboration primitives are *partially* implemented in the schema but never finished in the application layer:

1. `task.assigneeId` exists (`lib/db/schema.ts:348`) but no UI, no action, no notification — you cannot assign a task today.
2. `comment.mentioned` is declared as a notification type (`lib/domain/notifications.ts:27`) but nothing parses `@mentions`, writes them, or fires the notification.
3. `assertProjectRole()` is called in exactly one place (`setProjectDescriptionAction` at `lib/actions/projects.ts:205`), so a project `viewer` can in fact mutate most resources via direct action invocation — a defense-in-depth bug.

**Outcome.** Ship "Collaboration v1": single-assignee task assignment, `@mention`-with-autocomplete in comments, consistent role enforcement on every mutation action. Notifications fire **in-app immediately + transactional email asynchronously via pg-boss**. No new role types, no multi-assignee, no real-time presence — those are explicit non-goals deferred to v2.

## Locked decisions

| Decision | Value | Rationale |
|---|---|---|
| Assignment cardinality | Single (`assigneeId`) | Schema-aligned; multi noted as future phase in `lib/domain/comments.ts:10` |
| Mentionable / assignable | Anyone with project access (workspace member ∪ `projectMember` row) | Consistent with `requireProjectAccess` |
| Mention storage | `@[Display Name](user:USER_ID)` markdown link + `comment_mention` join table | Round-trips through any md parser; cheap reverse queries; clean cascade-delete |
| Notification channels | In-app immediately + immediate transactional email | User-chosen |
| Email infra | Reuse `lib/integrations/email.ts` (Resend) + new `lib/email/send-*.ts` templates | Existing pattern, no new dep |
| Email dispatch | Async via pg-boss; single generic queue `notification.email` | Worker switches on `notification.type`; future kinds add one template, no queue churn |
| `assertProjectRole` failure | **Throw a known error**; actions catch and return `ActionResult { ok: false, error: 'Insufficient permissions' }` | User-chosen; one existing call site to update; page guards keep redirecting via `requireProjectAccess` |
| Mentions of users without project access | Silent drop server-side (picker won't surface them anyway) | Lowest friction; auto-invite is a creep trap |
| Self-assign / self-mention | No notification fired | Obvious correct default |
| Un-mention on comment edit | Delete `comment_mention` row, no "you were un-mentioned" notification | Obvious correct default |
| Email throttling | None in v1 | Acceptable; revisit if abuse observed |

## Architecture

```
React component
   │
   ▼
lib/actions/*.ts             ──┐ Zod validate · requireTaskEditAccess() · ActionResult · revalidatePath
   │                           │
   ▼                           │
lib/domain/{tasks,comments,    │ pure-ish, takes organizationId, talks to Drizzle
              notifications}   │
   │                           │
   ▼                           │
lib/db/schema.ts               │ +1 table: comment_mention
                               │
notifyAssignment / notifyMention helpers ─┐
   │                                      │
   ├─► notification row insert            │ both effects in ONE helper per kind
   └─► boss.send('notification.email',{notificationId})
                                          │
                                          ▼
                          worker (lib/jobs/definitions/notification-email.ts)
                                          │
                          switch(notification.type) → send-task-assigned.ts | send-mention.ts
                                          │
                          lib/integrations/email.ts (Resend + dev console + .e2e-magic-links)
```

The load-bearing addition is **one new helper** `requireTaskEditAccess(taskId)` in `lib/auth/task-access.ts` that all task/comment/reminder/move actions route through. Converts the role audit from "edit 15 files individually" to "edit 1 helper + replace 15 call sites".

## Files to create

| Path | Purpose |
|---|---|
| `lib/auth/task-access.ts` | `requireTaskEditAccess(taskId)` — loads task, branches: projectId? → `requireProjectAccess` + `assertProjectRole(role, ['editor'])`; else `requireActiveOrganization()`. Returns `{ user, task, organizationId, role }` |
| `lib/parsers/mentions.ts` | `extractMentions(md)` (regex `/(?<![\w`])@\[([^\]]+)\]\(user:([a-zA-Z0-9_-]+)\)/g`); `diffMentions(prev, next)` |
| `lib/email/_e2e.ts` | Extract `writeE2EFile` from `send-invite.ts` into a shared helper |
| `lib/email/send-task-assigned.ts` | `sendTaskAssignedEmail({ to, actorName, taskTitle, taskUrl, projectName? })` |
| `lib/email/send-mention.ts` | `sendMentionEmail({ to, actorName, taskTitle, commentPreview, taskUrl, projectName? })` |
| `lib/jobs/definitions/notification-email.ts` | pg-boss handler: load notification, switch on `type`, dispatch to template. Export `NOTIFICATION_EMAIL_QUEUE = 'notification.email'` |
| `components/features/tasks/task-assignee-picker.tsx` | `Popover` + `Command` (reuse `components/ui/command.tsx` — same primitive as `command-palette.tsx`) + avatar trigger |
| `components/features/tasks/comment-mention-textarea.tsx` | Wraps `Textarea`; detects `@` at start-of-line or after whitespace; anchors a floating `Command` panel at cursor; inserts `@[Name](user:ID) ` on select |
| `tests/unit/parsers/mentions.test.ts` | Regex edge cases |
| `tests/unit/domain/comments-mentions.test.ts` | `processCommentMentions` add/remove diff (seeded DB) |
| `tests/unit/auth/task-access.test.ts` | Viewer denied, editor allowed, org-only task allowed |
| `tests/unit/domain/notifications.test.ts` | `notifyAssignment` skips self + enqueues job (mock `getBoss`) |
| `tests/e2e/collaboration-assign.spec.ts` | Assign → notification badge + email file |
| `tests/e2e/collaboration-mention.spec.ts` | `@`-pick in comment → notification + email file; edit adds 2nd mention → only new fires |
| `tests/e2e/collaboration-roles.spec.ts` | Viewer mutation attempt → action returns `{ ok: false, error: 'Insufficient permissions' }` |

## Files to modify

| Path | Change |
|---|---|
| `lib/db/schema.ts` | Add `commentMention` table (commentId+userId PK, cascade delete from comment & user, index on userId) |
| `lib/utils/markdown.tsx` | `components.a` override: when `href` starts with `user:`, render styled `<span>` instead of `<a>`. Optional `mentions?: Map` prop for live name resolution |
| `lib/auth/project-access.ts` | `assertProjectRole` throws a known error instead of `redirect()` |
| `lib/domain/tasks.ts` | Add `assignTask(...)`, `listAssignableUsers({ organizationId, projectId })` (UNION workspace `member` + `projectMember` for project) |
| `lib/domain/comments.ts` | Add `processCommentMentions(...)`, `listMentionUserIds(commentId)`, `updateCommentBody(...)` (own-author guarded) |
| `lib/domain/notifications.ts` | Add `notifyAssignment(...)` and `notifyMention(...)` — each does notif row write + `boss.send('notification.email', ...)`; skips self |
| `lib/actions/tasks.ts` | New `assignTaskAction(taskId, assigneeId\|null)`; refactor all mutation actions to use `requireTaskEditAccess` and catch `assertProjectRole` errors |
| `lib/actions/comments.ts` | `createCommentAction`: call `processCommentMentions` after insert, fire `notifyMention` for added user IDs. Add `updateCommentAction` with same flow. Use `requireTaskEditAccess` |
| `lib/actions/projects.ts` | Add `assertProjectRole` to `renameProjectAction`, `setProjectClientAction`, `archiveProjectAction`, section actions, `inviteToProjectAction`, `removeProjectMemberAction`, `updateProjectMemberRoleAction` |
| `lib/actions/task-move.ts`, `lib/actions/reminders.ts`, `lib/actions/quick-add.ts` | Use `requireTaskEditAccess` (move = both source and dest projects) |
| `lib/email/send-invite.ts` | Migrate `writeE2EFile` to `lib/email/_e2e.ts` and import |
| `worker/index.ts` | Register `notification-email` handler |
| `components/features/tasks/task-item.tsx` + `task-detail-dialog.tsx` | Mount `<TaskAssigneePicker />` |
| `components/features/tasks/task-comments-section.tsx` | Swap plain `Textarea` for `<CommentMentionTextarea />` |

`components/features/notifications/notifications-bell.tsx` needs **no changes** — it renders `title`/`body`/`link` generically; new types `task.assigned` and `comment.mentioned` just work as long as the helpers set those fields and `link` points to `/tasks/<id>` (or the project deep-link).

## Existing utilities to reuse (don't reinvent)

- `requireProjectAccess` (`lib/auth/project-access.ts`) — page + action guard
- `assertProjectRole` (`lib/auth/project-access.ts`) — role check (after we change its failure mode)
- `createNotification` (`lib/domain/notifications.ts`) — single notification row writer
- `getBoss` (`lib/jobs/boss.ts`) — pg-boss singleton
- `sendEmail` (`lib/integrations/email.ts`) — Resend wrapper with dev fallback
- `writeE2EFile` pattern (`lib/email/send-invite.ts`) — promote to shared helper
- `Command` / `CommandInput` / `CommandItem` (`components/ui/command.tsx`) — cmdk wrapper, already used by `command-palette.tsx`
- `Avatar` (`components/ui/avatar.tsx`)
- `Popover` (`components/ui/popover.tsx`)
- `revalidatePath` — call after every mutation action (existing convention)

## Build sequence (checkpoints recommended)

**Slice A — Assignment (proves end-to-end pattern, no email yet).**
1. `requireTaskEditAccess` helper + unit test
2. `assignTask` + `listAssignableUsers` in domain
3. `notifyAssignment` helper (notif row only; stub email enqueue)
4. `assignTaskAction`
5. `task-assignee-picker.tsx`; wire into row + detail dialog
6. E2E `collaboration-assign.spec.ts` (no email assertion yet) — **Checkpoint**

**Slice B — Email pipeline (one-time infra).**
7. `lib/email/_e2e.ts` shared helper
8. `lib/jobs/definitions/notification-email.ts` + worker registration
9. `lib/email/send-task-assigned.ts`
10. Un-stub `notifyAssignment` to enqueue
11. Extend E2E to assert on `.e2e-magic-links/assignment-*.txt` — **Checkpoint**

**Slice C — Mentions (reuses A+B infra).**
12. Schema migration for `comment_mention` (`pnpm db:generate && pnpm db:migrate`)
13. `lib/parsers/mentions.ts` + unit tests
14. Markdown renderer override for `user:` links
15. `processCommentMentions` in domain
16. Modify `createCommentAction`; add `updateCommentAction`
17. `notifyMention` helper + `lib/email/send-mention.ts`
18. `comment-mention-textarea.tsx` into `task-comments-section.tsx`
19. E2E `collaboration-mention.spec.ts` — **Checkpoint**

**Slice D — Role audit (mechanical; last because high blast radius).**
20. Change `assertProjectRole` failure mode (throw a known error class)
21. Refactor every action in the audit table to use `requireTaskEditAccess` or `requireProjectAccess + assertProjectRole`, wrapping in try/catch to return `ActionResult { ok: false }`
22. E2E `collaboration-roles.spec.ts`

## Role enforcement audit (what gets touched in Slice D)

| Action file | Actions needing role check | New guard |
|---|---|---|
| `lib/actions/tasks.ts` | `createTaskAction` (if projectId), `toggleTaskAction`, `setTaskScheduledAtAction`, `setTaskDueDateAction`, `deleteTaskAction`, `setTaskDescriptionAction`, `setTaskPriorityAction`, `setTaskTitleAction`, `setTaskEstimatedMinutesAction`, `assignTaskAction` | `requireTaskEditAccess` |
| `lib/actions/comments.ts` | `createCommentAction`, `updateCommentAction`, `deleteCommentAction` | `requireTaskEditAccess` |
| `lib/actions/task-move.ts` | `moveTaskAction` | `requireTaskEditAccess` on source + dest projects |
| `lib/actions/reminders.ts` | add / delete | `requireTaskEditAccess` |
| `lib/actions/quick-add.ts` | `createFromQuickAdd` if parser resolves a project | `requireTaskEditAccess` |
| `lib/actions/projects.ts` | `renameProjectAction`, `setProjectClientAction`, `archiveProjectAction`, section CRUD, `inviteToProjectAction`, `removeProjectMemberAction`, `updateProjectMemberRoleAction` | `requireProjectAccess` + `assertProjectRole(role, ['editor'])` |
| `lib/actions/timer.ts` | start/stop/manual/delete | **Keep org-only.** Viewers may track their own time on tasks they can read. Document the exemption inline. |
| `lib/actions/filters.ts`, `clients.ts` | all | **Unchanged.** Per-user / org-scoped, no project role concept. |

## Verification

Run after each slice (matches CI):
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
```

Manual smoke (requires worker):
```bash
# terminal 1
pnpm dev
# terminal 2
pnpm worker:dev
```

1. Sign in as user A; create a project; invite user B as editor; assign a task to B → B's notification bell increments, email file appears under `.e2e-magic-links/`.
2. As A, write a comment with `@`, pick B from popover, submit → B sees mention notification + email. Edit the comment to add a mention of user C → only C gets a new notification.
3. Invite user D as viewer → log in as D → attempt to edit a task title → action returns `{ ok: false, error: 'Insufficient permissions' }`; toast appears.
4. Run `pnpm db:studio`, confirm `comment_mention` rows correctly cascade-delete when a comment is deleted.

## Non-goals (explicit, for v2+)

- Multi-assignee
- Comment threading / replies
- Reactions
- Activity feed / event log per project
- Real-time presence
- Shared inbox (workspace-shared triage queue)
- Saved views shared across a project
- Time-entry approval workflows
- "You were un-mentioned" notifications
- Email throttling / per-user notification preferences
- New role types (commenter, etc.)
