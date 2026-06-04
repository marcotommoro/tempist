# Project description: rich-text editor + formatting fix

**Date:** 2026-05-29
**Status:** Approved

## Problem

1. The project description uses the legacy editor — a plain `<Textarea>` for raw
   markdown plus a `<Markdown>` renderer (`components/features/projects/project-description.tsx`).
   The user wants a true WYSIWYG rich-text editor.
2. When the editor is closed, formatting is not visible.

## Root causes

- **Inconsistency:** Tasks already migrated to a Tiptap WYSIWYG editor
  (`components/features/tasks/description-editor.tsx` exposes `DescriptionEditor`
  for editing and `RichTextContent` for read-only rendering; HTML is sanitized via
  `lib/utils/html.ts` and stored in the `descriptionMarkdown` column). Projects were
  never migrated and still use the markdown textarea.
- **Display bug:** `@tailwindcss/typography` is not installed and `prose` is defined
  nowhere in `app/globals.css`. The `prose prose-sm dark:prose-invert` classes used by
  both editors are therefore no-ops. Tailwind Preflight flattens `<h2>`/`<h3>` and
  removes list bullets, so headings and lists render unstyled (bold/italic survive
  because Preflight preserves them). This affects tasks too, but the user noticed it
  on projects.

## Design

Reuse the existing task editor components — no new dependencies, no new components.

### 1. Rewrite `components/features/projects/project-description.tsx`

Mirror `components/features/tasks/task-description-editor.tsx`:
- Edit mode: render `DescriptionEditor` (`value` = draft HTML, `onChange`, `onSubmit`,
  `onCancel`, `autoFocus`, `disabled` while pending).
- Read-only: render `RichTextContent` inside a `role="button"` wrapper that opens the
  editor on click (block markup can't live inside a `<button>`).
- Preserve the project-specific `canEdit` gate: when `!canEdit`, the read-only content
  is shown but clicking does not enter edit mode, and the empty-state "Add
  description" affordance is hidden (current behaviour at line 95).
- Use `isEmptyHtml` helper (`"" | "<p></p>"`) to detect "no description", same as tasks.
- Keep the `AlignLeft` empty-state icon and existing UI copy (Italian in the app).

### 2. Update `setProjectDescriptionAction` (`lib/actions/projects.ts`)

Run the incoming value through `normalizeDescriptionHtml(...)` (sanitize + null-if-empty)
before calling `setProjectDescription`, matching `setTaskDescriptionAction`. Keep the
existing `requireProjectAccess` + `assertProjectRole(role, ["editor"])` guard. The
`descriptionSchema` max-length check (10k) still runs first.

### 3. Install & wire `@tailwindcss/typography`

- `pnpm add -D @tailwindcss/typography`
- Add `@plugin "@tailwindcss/typography";` to `app/globals.css` (Tailwind v4 directive).

This makes `prose` real, so headings and lists are styled — fixing the "no formatting
when closed" complaint for both projects and tasks.

## Out of scope / decisions

- **No data migration.** Existing project descriptions are raw markdown; after this
  change they are rendered as HTML, so any literal markdown will display as text until
  the user reopens and re-saves. Accepted by the user (likely little/no existing data).
- No changes to the `descriptionMarkdown` column name (legacy; already holds HTML for
  tasks).

## Verification

- `pnpm typecheck` and `pnpm lint` clean.
- Manual: open a project, add a description with bold, a heading, and a bullet list;
  save; confirm formatting renders when the editor is closed. Reload to confirm
  persistence. Confirm a non-editor (read-only) user sees rendered content but cannot
  edit.
- Confirm task descriptions now also show heading/list styling (typography plugin).
