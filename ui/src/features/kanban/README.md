# Kanban Period Planner

A drag-and-drop kanban board for planning and tracking tasks within weekly periods. See [design.md](./design-doc/design.md) for full design doc including schema, API specs, and key flows.

## Current State

Backend complete (schema, DAL, services, server actions, board sync). Full board UI with drag-and-drop — `/kanban` displays a three-column kanban board (Todo, In Progress, Done) with task cards that can be dragged between columns. Moves use optimistic UI with server-side persistence and automatic rollback on failure. Task cards show title, description, unified type badge (`TaskTypeBadge` — supports DAILY, WEEKLY, and AD_HOC), and points with color-coded risk badges (⚠ at risk / ‼ urgent). Progress dashboard shows Today ring, stat metrics, and Week Progress Bar. End-of-period sync auto-expires undone tasks and transitions plans. Create/edit plan flows share a unified `PlanForm` with inline type/frequency config per template. AD_HOC tasks fully implemented end-to-end with plan linking. `ReviewChangesModal` shows added/removed/modified template diffs. Architecture follows strict 3-layer pattern with `prisma.$transaction()` for all multi-step mutations.

**v2 UI Redesign**: Complete mockup-v2 design system under `design/mockup-v2/` with 11 flow mockups and shared `styles.css` — "Techno Mission Control" aesthetic featuring cyan primary, violet secondary, amber warning palette. Covers all existing flows (board with collapsed/expanded backlog drawer, empty state, plan form with category groups, task modal, review changes, Eisenhower priority matrix) plus new flows (AI generate task via chat, end-of-period mission debrief summary, vacation/break mode, dedicated template library page). Light and dark theme variants with side-by-side comparison mockup. Custom daisyUI themes (`mars-dark`, `mars-light`) defined in `globals.css` via `@plugin "daisyui/theme"` and applied app-wide (`mars-dark` as default).

## Backlog
### High Priority
- [ ] Design evidence submit feature when user move task to done

### Future
- [ ] Support same group ordering for drag and drop within same column
- [ ] Add subtitle field to task template to support different titles
- [ ] Create common landing page for Mars workbench to navigate between features
- [ ] Phone notifications for unfinished tasks
- [ ] LLM-generated motivational messages
- [ ] Weekly task rollover across periods
- [ ] Biweekly and custom period types
- [ ] Refactor to use constant for all UI static text fields
- [ ] Support Ad-hoc task deletion and auto clear logic
- [ ] Implement light/dark theme toggle UI

## Update Log

### 2026-02-26
- Complete v2 UI redesign: created `mockup-v2/` with 11 mockup files and a shared design system CSS — "Techno Mission Control" aesthetic with cyan/violet neon palette, dark+light theme support
- New flows designed: AI generate task (chat-based), end-of-period summary (mission debrief), vacation/break mode (activate, standby, resume), dedicated template library page
- Redesigned all existing flows: board (with collapsed/expanded backlog drawer), empty state, plan form, task modal, review changes, Eisenhower priority matrix
- Created side-by-side light vs dark theme comparison mockup with interactive toggle
- Added custom daisyUI themes (`mars-dark`, `mars-light`) to `globals.css` using `@plugin "daisyui/theme"` syntax; applied `mars-dark` as default app theme

### 2026-02-25
- Designed Eisenhower priority matrix ("Priorities" page) for personal one-off tasks — full-page 2x2 matrix (Do First / Schedule / Squeeze In / Maybe Later) with Board/Priorities tab switcher; tasks can be sent to the board via "Track this week"; renames "Ad-hoc" badge to "Todo", backlog drawer to "Queued"
- Archived approved mockup to `design/mockup/future-work/mockup-priorities-v2.html`
- Updated `baseline.md` Planned: Future with priorities page and template categories entries
- Fixed backlog drawer v2 mockup CSS link (`./styles.css` → `../styles.css`)
- Updated `/design-explore` skill with explicit STOP gates for user approval between steps
- Replaced inline CLAUDE.md workflow docs (new-flow, new-feature, design-explore) with skill references

### 2026-02-24
- Designed full ad-hoc task flow: updated `baseline.md`, `flows.md`, `api.md` with ad-hoc creation, plan linking/unlinking, and projected points
- Merged `mockup-template-modal.html` and `mockup-adhoc-task-modal.html` into unified `mockup-task-modal.html` (3 tabs: New Template, Edit Template, Add Ad-hoc Task); updated all other mockups with ad-hoc elements
- Implemented ad-hoc task backend (Phase 1): schema migration (`planId` nullable on Task), 3 new DAL functions (`getNonDoneAdhocTasks`, `updateTasksPlanId`, `unlinkAdhocTasksFromPlan`), `createAdhocTaskAction` server action, ad-hoc linking/unlinking in `createPlan`/`updatePlan` services, ad-hoc tasks in week projected points, AD_HOC risk level calculation (warning at 5+ days, danger at 8+)
- Implemented ad-hoc task board UI (Phase 2): `TaskTypeBadge` now supports AD_HOC ("Ad-hoc" badge with warning color), "Add ad-hoc task" dashed button at bottom of Todo/In Progress columns, `TaskModal` (renamed from TemplateModal) extended with "adhoc" mode including info banner and "Add to Board" submit
- Renamed `template-modal/` → `task-modal/` (TemplateModal → TaskModal, TemplateModalHeader → TaskModalHeader, TemplateModalFooter → TaskModalFooter); deleted unused `TypeSelector.tsx` and `TaskPreview.tsx`
- Updated Zod schemas: `createAdhocTaskSchema`, added `adhocTaskIds` to `createPlanSchema`/`updatePlanSchema`, relaxed template minimum to allow plans with only ad-hoc tasks
- Added CLAUDE.md coding convention: no narrower DAL query variants when broader query + in-memory filter suffices
- Fixed plan form UX: unchecking and re-checking a template now preserves the server-loaded (or last-edited) type/frequency config via a `useRef` cache, instead of resetting to DAILY/1
- Aligned `TemplateItem` type pill buttons with `TaskTypeBadge` styling: `rounded-full` with colored border (info for DAILY, secondary for WEEKLY); added "Type" and "Freq" labels; full-width divider now spans the entire card (config section moved to card-level child)
- Renamed `RemoveInstancesModal.tsx` → `ReviewChangesModal.tsx` and `mockup-remove-instances.html` → `mockup-review-changes.html` to match the exported component name
- Rebuilt `ReviewChangesModal` to match mockup: section headers with icons + "N templates" badges, row detail with points/type/frequency, per-template impact text with real incomplete task counts from DB, modified rows with strikethrough old → highlighted new, dashed-border global note, ArrowPathIcon on confirm button
- Added `countIncompleteTasksByTemplateId` DAL function (groupBy) and `countIncompleteByTemplateAction` server action for per-template incomplete task counts
- Updated CLAUDE.md: added "Implementing UI Components" subsection to UI Workflow, added Bad/Good examples to rename rule, added meta-rule for convention examples
- Fixed timezone bug: Prisma `DATE` values (UTC midnight) were displaying one day behind in negative-offset timezones (e.g. PST/UTC-8); added `normalizeForDate` utility to convert to local calendar date before comparisons
- Fixed false rollover detection: today's daily tasks were incorrectly flagged as rollovers in PST because UTC midnight < local midnight
- Fixed done tasks showing the rollover `↩` badge; done tasks now never display any rollover or risk indicator
- Updated `formatShortDate` to use `timeZone: "UTC"` so the date label on rollover badges always shows the correct calendar date
- Updated `baseline.md`: moved daily task rollover and risk level visualization from Planned V2 to Implemented
- Added plan form ad-hoc integration (Phase 3): create/edit plan pages fetch and display non-done ad-hoc tasks with checkboxes; `ReviewChangesModal` shows added/removed ad-hoc task sections with lightning bolt icons
- Ad-hoc task initial status now matches source column: clicking "Add ad-hoc task" from In Progress creates with DOING status; added optional `status` field to schema and action
- Explored board card UX redesign to reduce visual clutter from duplicate template-generated cards; rejected grouped-stack and differentiated-card approaches in favor of a backlog drawer concept
- Designed backlog drawer mockup: expandable side panel (collapsed strip / open panel) for staging template instances before dragging to Todo; archived to `future-work/mockup-board-backlog-drawer-v2.html`

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
- Unified modal header styling: full-width underline (via negative-margin bleed) and matching X button (`XMarkIcon` + `btn-square`) across `TemplateModal` and `ReviewChangesModal`
- Wrapped all multi-step DB mutation flows in `prisma.$transaction()` — create plan, update plan (template rebuild), daily sync, and end-of-period sync are now fully atomic; DAL write functions accept optional `tx?` for composability
- Added Prisma transaction convention to CLAUDE.md coding conventions

### 2026-02-19
- Added skeleton loading states for board page (`/kanban`) and plan form pages (`/kanban/plans/*`) using Next.js `loading.tsx`
- Fixed stale design doc: removed outdated todayPoints bug note and updated fetchBoard pseudocode to reflect single-query approach
- Updated design doc with Option C week points calculation, Update Plan Flow section, and delete-instances mockup screen
- Implemented Option C projected week points: past daily instances + future daily projection from current templates + all weekly instances
- Renamed `weekTotalPoints`/`weekTotalCount` → `weekProjectedPoints`/`weekProjectedCount` across boardSync, ProgressDashboard, and page
- Added remove confirmation modal (`ReviewChangesModal`) — when editing a plan and removing templates, a modal shows affected templates and lets user choose to remove incomplete tasks from the board or keep them
- Added `countRemovedTasksAction` server action and `countTasksByTemplateIds`/`deleteIncompleteTasksByTemplateIds` DAL functions
- Fixed orphaned task type badge: derive type from task data (`forDate !== null` → Daily) instead of plan templates, so kept tasks show correct badge after template removal

### 2026-02-15
- Added progress dashboard with Today ring, stat metrics (Today Points, Week Points, Daily Avg), and Week Progress Bar
- Added end-of-period sync — auto-detects new week, expires undone tasks, moves plan to PENDING_UPDATE
- Create plan page preselects templates from previous plan; old plan archived to COMPLETED on submission
- Unified task type badge (`TaskTypeBadge`) shared by TaskCard
- Added "Planning Mode" header to plan create/edit pages
- Refactored TaskModal (formerly TemplateModal) into `task-modal/` directory with sub-components (header, footer, IconNumberField)
- Disabled task modal close on backdrop click

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
- [x] Ad-hoc task flow: plan form integration — ad-hoc task selection in create/edit plan, ReviewChangesModal ad-hoc sections
- [x] Ad-hoc task initial status matches source column (Todo → TODO, In Progress → DOING)
- [x] Ad-hoc task flow: board UI — TaskTypeBadge AD_HOC, add-task button in columns, TaskModal adhoc mode
- [x] Ad-hoc task flow: backend — schema migration, DAL, services, actions, risk levels, projected points
- [x] Ad-hoc task flow: design docs (baseline, flows, api) and unified task modal mockup
- [x] Fix plan form UX: preserve template config on re-toggle, align type pills with TaskTypeBadge + full-width divider
- [x] Align ReviewChangesModal with mockup: renamed files, added icons/badges/points/impact text with real task counts
- [x] Change in daily task expire logic, now expire forDate + 2, so daily task can be finished in two days
- [x] Risk indicators (red/yellow) for at-risk tasks
- [x] Rollover badge for daily tasks
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
- [x] v2 UI redesign: full mockup-v2 design system with 11 flows, light/dark themes, "Techno Mission Control" aesthetic
- [x] AI generate task flow design (chat-based template generation)
- [x] End-of-period summary flow design (mission debrief with stats and insights)
- [x] Vacation/break mode flow design (activate, standby, resume)
- [x] Dedicated template library page design
- [x] Eisenhower priority matrix redesigned in v2 style
- [x] Backlog drawer (collapsed + expanded) in v2 board design
- [x] Template categories in v2 plan form design
- [x] Custom daisyUI themes (mars-dark, mars-light) applied to app
