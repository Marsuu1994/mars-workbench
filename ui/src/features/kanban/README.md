# Kanban Period Planner

A drag-and-drop kanban board for planning and tracking tasks within weekly periods. See [design.md](./design-doc/design.md) for full design doc including schema, API specs, and key flows.

## Current State

Backend complete (schema, DAL, services, server actions, board sync). Full board UI with drag-and-drop — `/kanban` displays a three-column kanban board (Todo, In Progress, Done) with task cards that can be dragged between columns. Moves use optimistic UI with server-side persistence and automatic rollback on failure. Task cards show title, description, unified type badge (`TaskTypeBadge`), and points. Cards have hover lift+shadow effects. Layout is responsive full-height with independently scrollable columns. Board header shows "Kanban Planner" title with a week date-range badge and Edit Plan button linking to the edit plan page. Plan form pages show a "Planning Mode" header with a back chevron (←) that navigates directly back to the board. Progress dashboard sits between the header and board columns showing: Today progress ring (SVG circle with percentage), three stat metrics (Today Points, Week Points, Daily Avg), and a Week Progress Bar with gradient fill. Week Points uses Option C projected calculation (past daily instances + future daily projection from current templates + all weekly instances). All metrics are computed server-side from a single DB query. End-of-period sync automatically detects when a new week starts, expires all undone tasks, and transitions the plan to `PENDING_UPDATE`. Create plan flow at `/kanban/plans/new` preselects templates from the previous plan (carrying over type and frequency configuration); on submission the old plan is archived to `COMPLETED`. Edit plan flow at `/kanban/plans/[id]` shares a unified `PlanForm` component and layout with create. Task `type` and `frequency` are now configured per-plan on `PlanTemplate` (not globally on `TaskTemplate`), allowing the same template to be DAILY one week and WEEKLY the next. When a template is selected in the plan form, it expands inline showing DAILY/WEEKLY pill buttons and a frequency input. Template rows list flat (no Daily/Weekly group headers). `Task` carries its own `type` field stamped at generation time so no join through the template is needed at query time. `AD_HOC` task type added to the enum (V2 roadmap). When editing a plan, clicking "Update Plan" shows a "Review Plan Changes" modal with three sections — Added (green), Removed (red), Modified (amber) — and a single "Confirm & Regenerate" button; done and expired tasks are never affected. Create/edit task template modal (sub-components under `template-modal/`) now only collects title, description, and points — type selector, frequency, and preview section removed. Skeleton loading states for board page and plan form pages via Next.js `loading.tsx` convention. Architecture follows a strict 3-layer pattern: actions (thin Zod validate → service → revalidate), services (business logic), DAL (Prisma queries). UI components interact only via server actions — no direct service or DAL calls from page components. All multi-step DB mutation flows (create plan, update plan, daily sync, end-of-period sync) are wrapped in `prisma.$transaction()` for ACID atomicity; DAL write functions accept an optional `tx?` parameter. Design mockups are split by flow under `design/mockup/` with a shared `styles.css`.

## Backlog
### High Priority
- [ ] Add Ad-hoc task flow

### MVP V2
- [ ] Design the AI generated task instance flow

### Future
- [ ] Support same group ordering for drag and drop within same column
- [ ] Design better way to handle task templates
- [ ] Add subtitle field to task template to support different titles
- [ ] Create common landing page for Mars workbench to navigate between features
- [ ] Task overlap visualization (stacked cards)
- [ ] Rollover badge for daily tasks
- [ ] Risk indicators (red/yellow) for at-risk tasks
- [ ] Phone notifications for unfinished tasks
- [ ] LLM-generated motivational messages
- [ ] End-of-period summary before new plan
- [ ] Weekly task rollover across periods
- [ ] Biweekly and custom period types
- [ ] Design way to manage UI effect when there are too many task templates
- [ ] Refactor to use constant for all UI static text fields

## Update Log

### 2026-02-23
- Moved `type` and `frequency` from `TaskTemplate` (global, immutable) to `PlanTemplate` (per-plan, reconfigurable each week) — the same blueprint can now be DAILY one week and WEEKLY the next
- Added `type` field directly on `Task` (stamped at generation time), eliminating the need to join through the template at query time; `templateId` made nullable to support future AD_HOC tasks
- Added `AD_HOC` value to `TaskType` enum (V2 roadmap, not yet implemented in UI)
- Hand-crafted SQL migration with data backfill: columns added nullable → backfilled from task_templates → NOT NULL enforced → old columns dropped
- Plan form redesigned: templates list flat (no Daily/Weekly group headers); selected rows expand inline with DAILY/WEEKLY type pills and a frequency input
- "Review Plan Changes" modal replaces old binary "Remove from board?" modal — shows Added/Removed/Modified sections with a single "Confirm & Regenerate" action; done and expired tasks are never affected
- Template modal simplified: removed type selector, frequency field, and live preview — only title, description, and points remain
- `templateTypeMap` lookup eliminated; task type is now read directly from `task.type`
- Updated `updatePlan` service with three-way diff (added/removed/modified) and atomic regeneration of affected tasks

### 2026-02-20
- Introduced `services/` layer: extracted plan business logic into `planService.ts` and moved board sync into `boardService.ts`
- Thinned `planActions.ts` to pure validate → service → revalidate; removed inline `generateTasksForPlan` helper
- Added `boardActions.ts` with `fetchBoardAction()` so the kanban page goes through the action layer instead of calling the service directly
- Added back chevron (←) to the plan form header for one-click navigation back to the board
- Split monolithic `mockup.html` into per-flow files under `design/mockup/` with a shared `styles.css`
- Added "no direct service/DAL calls from UI" and "split mockups by flow" rules to CLAUDE.md
- Unified modal header styling: full-width underline (via negative-margin bleed) and matching X button (`XMarkIcon` + `btn-square`) across `TemplateModal` and `RemoveInstancesModal`
- Wrapped all multi-step DB mutation flows in `prisma.$transaction()` — create plan, update plan (template rebuild), daily sync, and end-of-period sync are now fully atomic; DAL write functions accept optional `tx?` for composability
- Added Prisma transaction convention to CLAUDE.md coding conventions

### 2026-02-19
- Added skeleton loading states for board page (`/kanban`) and plan form pages (`/kanban/plans/*`) using Next.js `loading.tsx`
- Fixed stale design doc: removed outdated todayPoints bug note and updated fetchBoard pseudocode to reflect single-query approach
- Updated design doc with Option C week points calculation, Update Plan Flow section, and delete-instances mockup screen
- Implemented Option C projected week points: past daily instances + future daily projection from current templates + all weekly instances
- Renamed `weekTotalPoints`/`weekTotalCount` → `weekProjectedPoints`/`weekProjectedCount` across boardSync, ProgressDashboard, and page
- Added remove confirmation modal (`RemoveInstancesModal`) — when editing a plan and removing templates, a modal shows affected templates and lets user choose to remove incomplete tasks from the board or keep them
- Added `countRemovedTasksAction` server action and `countTasksByTemplateIds`/`deleteIncompleteTasksByTemplateIds` DAL functions
- Fixed orphaned task type badge: derive type from task data (`forDate !== null` → Daily) instead of plan templates, so kept tasks show correct badge after template removal

### 2026-02-15
- Added progress dashboard with Today ring, stat metrics (Today Points, Week Points, Daily Avg), and Week Progress Bar
- Added end-of-period sync — auto-detects new week, expires undone tasks, moves plan to PENDING_UPDATE
- Create plan page preselects templates from previous plan; old plan archived to COMPLETED on submission
- Unified task type badge (`TaskTypeBadge`) shared by TaskCard and TaskPreview
- Added "Planning Mode" header to plan create/edit pages
- Refactored TemplateModal into `template-modal/` directory with sub-components (header, footer, TypeSelector, IconNumberField)
- Disabled template modal close on backdrop click

### 2026-02-14
- Added create/edit task template modal with title, description, type selector (Daily/Weekly), points, frequency, and live preview
- Type is immutable when editing an existing template
- Edit icon on template rows reveals on hover; "+ New Template" button enabled with border styling
- Extracted `TaskPreview` component for reuse
- Unified star/points icon color to `text-warning` across all components
- Added edit plan flow at `/kanban/plans/[id]` with prefilled description and preselected templates
- Unified create/edit into shared `PlanForm` component with mode-based header and submit label
- Extracted shared plans layout (`/kanban/plans/layout.tsx`) for create and edit pages
- Edit Plan button in board header now links to the current plan's edit page
- Added board header with "Kanban Planner" title, week date-range badge, and Edit Plan button

### 2026-02-13
- Added drag-and-drop between columns using `@hello-pangea/dnd` with optimistic UI and server rollback
- Dragging cards shows lifted style (shadow, ring, scale); drop targets highlight on hover
- Fixed post-drop reshuffle animation by scoping CSS transitions to exclude `transform`
- Added deterministic sort tiebreaker (`id`) to prevent card order jumps after server revalidation
- Merged `taskSort.ts` and `taskGroup.ts` into `taskUtils.ts`
- Board UI with glassmorphism columns, task cards showing title, description, type badge, and points
- Empty state and create plan flow (`EmptyBoard`, `/kanban/plans/new`)

### 2026-02-12
- Refactored `syncAndFetchBoard()` into `runDailySync()` + `fetchBoard()` — sync logic is now standalone and reusable by future cron job
- Added `lastSyncDate` column to Plan model — skips redundant daily syncs on repeated page loads
- Plan creation and template updates now set `lastSyncDate` to prevent unnecessary sync on first load
- Added Prisma schema (Plan, TaskTemplate, PlanTemplate, Task) and ran migration
- Implemented data access layer (`lib/db/`) for all kanban entities
- Installed Zod and created validation schemas for kanban inputs
- Server Actions: create/update plan, create/update task template, update task status
- Board sync utility: expire stale tasks, generate daily tasks (idempotent via `skipDuplicates`)
- Kanban page Server Component with board data fetching
- Design doc written with schema, API specs, entities, and key flows
- UI mockups created (board, empty state, create plan, create/edit template)

## Done
- [x] Review design for new schema updates, generate necessary mockups
- [x] Schema migration: move type/frequency from TaskTemplate to PlanTemplate, add Task.type, make templateId nullable, add AD_HOC to enum
- [x] Implement updated plan form (inline type pills + frequency per template), "Review Plan Changes" modal, simplified template modal
- [x] Make all DB actions using transactions
- [x] Adjust look and feel for both modals, the x button should look same, and modal header should have a underline
- [x] Adjust weekly total point tasks calculation flow (Option C projected calculation)
- [x] When remove a task template during edit plan, add modal to check if user want to delete existing undone tasks on board
- [x] Uniform loading states for board and plan pages
- [x] Unified task type badge, planning mode header, refactored template modal into sub-components, disabled backdrop close
- [x] End-of-period sync — auto-detect new week, expire undone tasks, transition plan to PENDING_UPDATE
- [x] Preselect task templates from previous plan when creating a new plan; archive old plan to COMPLETED
- [x] Score bar — today's points, tasks done count, week progress
- [x] Create/edit task template modal — title, description, type, points, frequency, live preview
- [x] Edit plan flow with prefilled description and preselected templates
- [x] Board header with title, week date-range badge, and Edit Plan button
- [x] Kanban board page (`/kanban`) — three columns (Todo, In Progress, Done) with glassmorphism styling
- [x] No-plan empty state with "Create Plan" prompt
- [x] Create plan flow — period selector, description, template picker
- [x] Write design doc with schema, API specs, entities, and key flows
- [x] Create UI mockups (board, empty state, create plan, create/edit template)
- [x] Add Prisma schema (Plan, TaskTemplate, PlanTemplate, Task) and run migration
- [x] Implement data access layer (`lib/db/`) for kanban entities
- [x] Install Zod and create validation schemas for kanban inputs
- [x] Server Action: create plan + generate initial tasks
- [x] Server Action: update plan (description, templates)
- [x] Server Action: create/update task template
- [x] Server Action: update task status (drag and drop)
- [x] Board sync utility: expire stale tasks, generate daily tasks (idempotent)
- [x] Kanban page Server Component with board data fetching
- [x] Refactor board sync: separate `runDailySync()` from `fetchBoard()`, add `lastSyncDate` to skip redundant syncs
- [x] Drag and drop task cards between columns with optimistic UI
