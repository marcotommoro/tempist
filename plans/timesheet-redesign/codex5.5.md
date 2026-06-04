# Flexible Reporting Redesign

## Goal

Make `timesheet`, `reports`, and client detail feel more like an operational cockpit: wide view, month picker always available, quick filters, toggleable sections, and data that updates immediately when the URL changes. The solution stays server-first: data is computed in Server Components/domain functions, while client controls update `searchParams` with `router.replace(..., { scroll: false })` and `useTransition`.

## Relevant context

- [`app/(app)/layout.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/layout.tsx) currently forces all pages inside `max-w-3xl`, limiting dashboards and tables.
- [`app/(app)/reports/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/reports/page.tsx) only supports `week | last-week | month`, where `month` means the current month.
- [`app/(app)/timesheet/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/timesheet/page.tsx) has weekly/custom range, client/project filters, and a default limit of 200 entries.
- [`app/(app)/clients/[id]/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/clients/[id]/page.tsx) has local range logic and a single column, despite billing, quick grid, tasks, and time entries.
- Next 16 docs: read `searchParams` in the Page Server Component; `useSearchParams`/`useRouter` are for Client Components and should be isolated with `Suspense` when needed. `next/form` and client-side navigation are useful for progressive GET filters. Context7 confirms React 19 patterns with `useTransition` for responsive UI and Recharts 3 with `ResponsiveContainer`/`ComposedChart` for dashboards.

## Proposed design

### 1. Scoped wide layout

Change [`app/(app)/layout.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/layout.tsx) to keep the narrow default but let specific pages expand. The most targeted approach is a marker like `data-page-width="wide"` on the root of the three pages and a Tailwind/CSS rule with `:has()` on the inner wrapper. That way `today`, `inbox`, `projects`, etc. stay unchanged.

### 2. Shared filter model

Create a type-safe helper, e.g. [`lib/utils/reporting-range.ts`](/Users/marcotommoro/dev/tempist/lib/utils/reporting-range.ts), replacing duplication between `report-range.ts`, `timesheet-week.ts`, and client-local `resolveRange()`. It will support:
- `month=YYYY-MM` to pick any month.
- `period=month | week | custom | all` where needed.
- validated `from/to` for custom range, with consistent `[from, to)` bounds.
- preservation of `clientId`, `projectId`, `view`, `groupBy`, `show`.

### 3. Reusable components

Add components under [`components/features/reports/`](/Users/marcotommoro/dev/tempist/components/features/reports/) reused by all three pages:
- `ReportingToolbar`: month selector with prev/next, "today" shortcut, custom range, client/project select, reset, pending state.
- `ViewToggleBar`: buttons to choose what to show (`overview`, `charts`, `clients`, `projects`, `entries`, `tasks`, `grid`).
- `MetricGrid`: consistent, more readable KPI cards.
- `DataPanel`: cards/tables with header, count, empty state, export actions.

Controls update the query string with a whitelist of known keys, avoiding unsanitized URLs and keeping filters shared across CSV/print/pages.

### 4. Reports page

Restructure [`app/(app)/reports/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/reports/page.tsx) as a wide dashboard:
- Sticky toolbar with month, custom range, client, project, `groupBy`, and `show`.
- Wide KPI grid: hours, billable, non-billable, entries, completed tasks, daily average.
- Main chart Clockify/Kimai style with Recharts `ComposedChart`: hours per day plus billable/internal.
- Toggleable sections: by client, by project, daily trend, detail table.
- CSV export and print preserve the same parameters.

Extend [`lib/domain/time-entries.ts`](/Users/marcotommoro/dev/tempist/lib/domain/time-entries.ts), [`lib/domain/analytics.ts`](/Users/marcotommoro/dev/tempist/lib/domain/analytics.ts), and [`lib/domain/tasks.ts`](/Users/marcotommoro/dev/tempist/lib/domain/tasks.ts) to accept `clientId`, `projectId`, billable/internal filters and grouping without dropping `organizationId` in any query.

### 5. Timesheet page

Update [`app/(app)/timesheet/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/timesheet/page.tsx) and [`components/features/timer/timesheet-filters.tsx`](/Users/marcotommoro/dev/tempist/components/features/timer/timesheet-filters.tsx):
- Move from hard navigation via `window.location.href` to `router.replace` with `useTransition`.
- Add selectable month (`month=YYYY-MM`) and view toggle `day | week | month`.
- Wider layout with denser entry table, totals on top, collapsible groupings.
- Remove the fragile implicit 200-entry cap for months; replace with an explicit suitable limit or light pagination when data is large.

### 6. Client detail page

Restructure [`app/(app)/clients/[id]/page.tsx`](/Users/marcotommoro/dev/tempist/app/(app)/clients/[id]/page.tsx) as a client dashboard:
- Wide header with quick actions, rate, email/VAT, and active month.
- Single toolbar for billing range and week grid, preserving parameters.
- Flexible sections: overview, quick grid, project breakdown, tasks, time entries.
- Trello/Clockify-style overview: columns or panels per project with hours, amount, entries, and linked tasks.
- [`components/features/timer/client-billing-filters.tsx`](/Users/marcotommoro/dev/tempist/components/features/timer/client-billing-filters.tsx) becomes a wrapper around the new `ReportingToolbar` instead of keeping local range logic.

### 7. Export, print, and URL consistency

Update [`app/api/reports/time-entries.csv/route.ts`](/Users/marcotommoro/dev/tempist/app/api/reports/time-entries.csv/route.ts) and [`app/(print)/reports/print/page.tsx`](/Users/marcotommoro/dev/tempist/app/(print)/reports/print/page.tsx) to use the same filter parser. Month, custom range, client, and project then produce the same data on page, CSV, and print.

### 8. Verification

Add or update focused tests:
- Unit tests for range/search param parser in [`tests/unit/`](/Users/marcotommoro/dev/tempist/tests/unit/).
- Domain tests for filtered aggregations where useful fixtures already exist.
- Light Playwright E2E: change month on reports/client/timesheet and verify URL, updated KPI/heading, and no full reload.
- Final checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and if time/DB available targeted `pnpm test:e2e`.

## Work sequence

1. Introduce shared filter/range helper and unit tests.
2. Enable scoped wide layout without changing non-involved pages.
3. Implement reusable toolbar/toggle/metric/panel components.
4. Migrate reports and sync CSV/print.
5. Migrate timesheet.
6. Migrate client detail.
7. Run tests, browser check, and responsive/a11y polish.

## Todo

- [ ] Create shared range/search param parser with unit tests.
- [ ] Make only marked pages wide without altering other app views.
- [ ] Build reusable toolbar, toggle, and panels for reports/timesheet/clients.
- [ ] Redesign reports with free month picker, immediate filters, chart, and consistent export.
- [ ] Redesign timesheet with free month, grouped views, and client-side navigation.
- [ ] Redesign client detail as flexible dashboard with toggleable sections.
- [ ] Add focused tests and verify lint/typecheck/test.
