# Kanban Period Planner

A drag-and-drop kanban board for planning and tracking tasks within weekly periods. See [design.md](./design-doc/design.md) for full design doc including schema, API specs, and key flows.

## Current State

Backend complete (schema, DAL, server actions, board sync). Full board UI implemented — `/kanban` displays a three-column kanban board (Todo, In Progress, Done) with task cards showing title, description, type badge, and points. Columns and cards use glassmorphism styling (frosted-glass translucency). Cards have hover lift+shadow effects. Layout is responsive full-height with independently scrollable columns. Empty state and create plan flow available when no active plan exists. Drag-and-drop not yet implemented.

## Backlog
### High Priority
- [ ] Drag and drop task cards between columns with optimistic UI
- [ ] Create/edit task template modal — title, description, type, points, frequency

### MVP
- [ ] Score bar — today's points, tasks done count, week progress
- [ ] Add end of period sync flow
- [ ] Add preselect task template from pending_update plan
- [ ] Create common header for kanban page

### Future
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

### 2026-02-13
- Implemented three-column kanban board (Todo, In Progress, Done) with `KanbanBoard`, `BoardColumn`, and `TaskCard` components
- Task cards display title, description, type badge (Daily/Weekly), and star-rated points
- Added glassmorphism styling on columns (`bg-base-200/60 backdrop-blur-xl`) and cards (`bg-base-100/70 backdrop-blur-md`)
- Card hover effect with lift, shadow increase, and brighter border
- Responsive full-height layout — columns stretch to fill viewport, task lists scroll independently
- Added task sorting utility (`taskSort.ts`) and `TaskStatus` enum
- Added styled empty state and create plan flow (`EmptyBoard`, `/kanban/plans/new`)

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
