# Kanban Period Planner

A drag-and-drop kanban board for planning and tracking tasks within weekly periods. See [design.md](./design-doc/design.md) for full design doc including schema, API specs, and key flows.

## Current State

Schema and data access layer complete. API routes and UI not yet implemented.

## Backlog

### MVP
- [ ] `GET /api/board` — fetch active board with daily sync side effect
- [ ] `POST /api/plans` — create plan and generate initial tasks
- [ ] `PATCH /api/plans/:id` — update existing plan
- [ ] `GET /api/plans` — load active/pending_update plan with templates
- [ ] `POST /api/taskTemplates` — create task template
- [ ] `PATCH /api/taskTemplates/:id` — update task template
- [ ] `GET /api/taskTemplates` — list all available templates
- [ ] `PATCH /api/tasks/:id` — update task status (drag and drop)
- [ ] Daily sync logic: expire stale daily tasks, generate today's tasks (idempotent)
- [ ] Kanban board page (`/kanban`) — three columns (Todo, Doing, Done)
- [ ] Drag and drop task cards between columns with optimistic UI
- [ ] No-plan empty state with "Create Plan" prompt
- [ ] Create plan flow — period selector, description, template picker
- [ ] Create/edit task template modal — title, description, type, points, frequency
- [ ] Score bar — today's points, tasks done count, week progress
- [ ] Zustand store for kanban state management
- [ ] Create common landing page for Mars workbench to navigate between features

### Future
- [ ] Task overlap visualization (stacked cards)
- [ ] Rollover badge for daily tasks
- [ ] Risk indicators (red/yellow) for at-risk tasks
- [ ] Phone notifications for unfinished tasks
- [ ] LLM-generated motivational messages
- [ ] End-of-period summary before new plan
- [ ] Weekly task rollover across periods
- [ ] Biweekly and custom period types

## Done
- [x] Write design doc with schema, API specs, entities, and key flows
- [x] Create UI mockups (board, empty state, create plan, create/edit template)
- [x] Add Prisma schema (Plan, TaskTemplate, PlanTemplate, Task) and run migration
- [x] Implement data access layer (`lib/db/`) for kanban entities
