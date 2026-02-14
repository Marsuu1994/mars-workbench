# Kanban Period Planner

A drag-and-drop kanban board for planning and tracking tasks within weekly periods. See [design.md](./design-doc/design.md) for full design doc including schema, API specs, and key flows.

## Current State

Backend complete (schema, DAL, server actions, board sync). Full board UI with drag-and-drop — `/kanban` displays a three-column kanban board (Todo, In Progress, Done) with task cards that can be dragged between columns. Moves use optimistic UI with server-side persistence and automatic rollback on failure. Task cards show title, description, type badge, and points. Cards have hover lift+shadow effects. Layout is responsive full-height with independently scrollable columns. Board header shows "Kanban Planner" title with a week date-range badge and Edit Plan button. Empty state and create plan flow available when no active plan exists.

## Backlog
### High Priority
- [ ] Add edit plan flow, basically same as create plan flow but with preselected task template
- [ ] Create/edit task template modal — title, description, type, points, frequency

### MVP
- [ ] Score bar — today's points, tasks done count, week progress
- [ ] Add end of period sync flow
- [ ] Add preselect task template from pending_update plan

### Future
- [ ] Support same group ordering for drag and drop within same column
- [ ] Design better way to handle task templates
- [ ] Add subtitle field to task template to support different titles
- [ ] Create common landing page for Mars workbench to navigate between features
- [ ] Make all DB actions using transactions
- [ ] Task overlap visualization (stacked cards)
- [ ] Rollover badge for daily tasks
- [ ] Risk indicators (red/yellow) for at-risk tasks
- [ ] Phone notifications for unfinished tasks
- [ ] LLM-generated motivational messages
- [ ] End-of-period summary before new plan
- [ ] Weekly task rollover across periods
- [ ] Biweekly and custom period types
- [ ] Design way to manage UI effect when there are too many task templates

## Update Log

### 2026-02-14
- Added board header with "Kanban Planner" title, week date-range badge (e.g. "Week 06 · Feb 3 – Feb 9"), and Edit Plan button
- Added `getWeekDateRange()` utility to derive Monday–Sunday range from ISO week key

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
