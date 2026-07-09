# Reference

Inventory of the handlers and data-access functions that already exist, so new work extends them instead of duplicating. Detailed contracts (parameters, return shapes, error handling) live in the TypeScript types and code — this file only answers "does something for this already exist, and where?".

## Principles

- Before adding a new action or endpoint, check if an existing one can be extended to cover the case.
- Keep handlers thin — validate input, call service, return result. No business logic inside handlers.
- One handler per logical operation, not per UI interaction. A single handler can cover multiple related mutations.
- If two flows share the same mutation, they share the same handler. Never duplicate handler logic.
- Use Server Actions for mutations triggered from Server or Client Components. Use API routes when you need webhooks, streaming, or third-party callbacks.

## Server Actions

| Action | Purpose | Calls |
| --- | --- | --- |
| **`src/actions/boardActions.ts`** | | |
| `fetchBoardAction` | Load board data + metrics for `/kanban` | `boardService.fetchBoard` |
| `getEmptyBoardStateAction` | Resolve no-active-plan state (new user vs. finished-plan recap) | `boardService.getEmptyBoardState` |
| **`src/actions/taskActions.ts`** | | |
| `updateTaskStatusAction` | Move a task between board columns (drag & drop) | `db/tasks.updateTaskStatus` |
| `createAdhocTaskAction` | Add an unassigned ad-hoc task to a quadrant | `db/tasks.createTask` |
| **`src/actions/planActions.ts`** | | |
| `createPlanAction` | Create a weekly plan from the plan form | `planService.createPlan` |
| `updatePlanAction` | Update an existing plan (templates, mode, ad-hoc links) | `planService.updatePlan` |
| `countIncompleteByTemplateAction` | Per-template removable-task counts for the review modal | `db/tasks.countIncompleteTasksByTemplateId` |
| **`src/actions/templateActions.ts`** | | |
| `createTaskTemplateAction` | Create a task template | `db/taskTemplates.createTaskTemplate` |
| `updateTaskTemplateAction` | Edit a task template | `db/taskTemplates.updateTaskTemplate` |
| **`src/actions/aiChatActions.ts`** | | |
| `getTemplateStatsAction` | Last-plan per-template stats for the AI chat | `aiChatService.getTemplateStats` |
| `createAiChatAction` | Start a new AI plan-creation chat | `aiChatService.createAiChat` |
| `getActiveAiChatAction` | Load the resumable in-progress chat for rehydration | `aiChatService.getActiveAiChat` |
| `generateDraftPlanAction` | Send a user message, generate/revise a draft plan | `aiChatService.generateDraftPlan` |
| `resumeDraftPlanAction` | Regenerate after an interrupted LLM call (no new turn) | `aiChatService.resumeDraftPlan` |
| `approveDraftPlanAction` | Approve the latest draft and create the plan | `aiChatService.approveDraftPlan` |
| **`src/actions/matrixActions.ts`** | | |
| `fetchPriorityMatrixAction` | Load matrix tasks + active-plan info for `/kanban/priorities` | `matrixService.fetchPriorityMatrix` |
| `updateTaskQuadrantAction` | Move a task between Eisenhower quadrants | `db/tasks.updateTaskQuadrant` |
| `trackTaskAction` | Track This Week: pull a matrix task onto the board | `matrixService.trackTaskThisWeek` |

## Services (src/services)

| Function | Purpose |
| --- | --- |
| **`boardService.ts`** | |
| `fetchBoard` | Board data + metrics for the active plan (null = no active plan) |
| `getEmptyBoardState` | Resolve the no-active-plan state (new user vs. finished-plan recap) |
| **`planService.ts`** | |
| `createPlan` | Create a plan from the plan form (templates, mode, ad-hoc links) |
| `updatePlan` | Rebuild an existing plan's templates/mode/ad-hoc links |
| `createPlanFromDraft` | Create a plan from an approved AI draft |
| `createPlanInTx` | Shared transactional plan-creation core reused by `createPlan`/`createPlanFromDraft` |
| **`matrixService.ts`** | |
| `fetchPriorityMatrix` | Matrix tasks + active-plan info for `/kanban/priorities` |
| `trackTaskThisWeek` | Track This Week: pull a matrix task onto the board |
| **`aiChatService.ts`** | |
| `getTemplateStats` | Last-plan per-template stats for the AI chat |
| `createAiChat` | Start a new AI plan-creation chat |
| `getActiveAiChat` | Load the resumable in-progress chat for rehydration |
| `generateDraftPlan` | Send a user message, generate/revise a draft plan |
| `resumeDraftPlan` | Regenerate after an interrupted LLM call (no new turn) |
| `approveDraftPlan` | Approve the latest draft and create the plan |

## Sync Service (src/services/syncService.ts)

Flow-level spec: [flows/shared.md](./flows/shared.md).

| Function | Purpose |
| --- | --- |
| **`syncService.ts`** | |
| `ensureSynced` | Single sync entry point awaited by every kanban page before reading plan state; flips an ended ACTIVE plan to PENDING_UPDATE, runs the daily sync at most once per day, returns the current-week ACTIVE plan or null. Idempotent, wrapped in React `cache()`. |
| `runDailySync` | Expire stale daily tasks + generate today's daily instances (standalone for a future cron) |
| `runEndOfPeriodSync` | Expire all undone tasks and move the plan to PENDING_UPDATE (standalone for a future cron) |

## DAL (src/lib/db)

| Function | Purpose |
| --- | --- |
| **`plans.ts`** | |
| `getActivePlan` | Get the user's ACTIVE plan |
| `getPlanByStatus` | Get the user's plan by status (e.g. PENDING_UPDATE) |
| `getPlanWithTemplates` | Plan + linked templates; null return doubles as the ownership gate |
| `createPlan` | Create a plan with ACTIVE status |
| `updatePlan` | Update plan fields (description, mode), owner-scoped |
| `updatePlanStatus` | Transition a plan's status, owner-scoped |
| `updateLastSyncDate` | Set `lastSyncDate` (daily-sync short-circuit) |
| **`tasks.ts`** | |
| `getTasksByPlanId` | All tasks for a plan, ordered by creation time |
| `getBoardTasksByPlanId` | Board-visible tasks for a plan (excludes EXPIRED) |
| `getBoardMetricsByPlanId` | All board metrics in one SQL aggregate query |
| `getTasksByPlanIdAndStatus` | Tasks for a plan filtered by statuses |
| `createTask` | Create one task instance (planId null = unassigned matrix task) |
| `createManyTasks` | Bulk create task instances with `skipDuplicates` (idempotent) |
| `updateTaskStatus` | Set a task's status (+`doneAt` on DONE); returns updated row or null |
| `updateTaskQuadrant` | Set the Eisenhower quadrant of an owned AD_HOC task |
| `trackAdhocTask` | Attach an unassigned matrix task to a plan (BACKLOG → board) in one write |
| `expireStaleDailyTasks` | Expire non-DONE daily tasks older than the cutoff (1-day rollover buffer) |
| `expireAllNonDoneTasks` | End-of-period cleanup: expire all non-done, non-ad-hoc tasks |
| `getDailyTasksForDate` | Daily tasks for a specific date (idempotency check) |
| `taskExists` | Existence + ownership check |
| `deleteIncompleteTasksByTemplateIds` | Delete TODO/DOING tasks for given templates in a plan |
| `countTasksByTemplateIds` | Total incomplete-task count for given templates |
| `countIncompleteTasksByTemplateId` | Incomplete-task counts grouped by templateId |
| `getNonDoneAdhocTasks` | All non-DONE AD_HOC tasks (matrix data source) |
| `updateTasksPlanId` | Batch link ad-hoc tasks to a plan, owner-scoped |
| `unlinkAdhocTasksFromPlan` | Return deselected ad-hoc tasks to the matrix (DONE tasks stay) |
| `getPlanTemplateStats` | Per-template performance aggregates (LLM signal + recap stats) |
| `isValidTaskStatus` | TaskStatus type guard (with `VALID_TASK_STATUSES` const) |
| **`taskTemplates.ts`** | |
| `getTaskTemplates` | Non-archived templates for a user, newest first |
| `getTaskTemplateTitlesByIds` | Map template ids → titles (includes archived, for stats labels) |
| `getTaskTemplateById` | Single template, owner-scoped |
| `createTaskTemplate` | Create a task template |
| `createManyTaskTemplates` | Batch-create templates; returned ids preserve input order |
| `updateTaskTemplate` | Update a template, owner-scoped (count 0 = not found) |
| **`planTemplates.ts`** | |
| `getPlanTemplatesByPlanId` | All plan-template links for a plan |
| `createManyPlanTemplates` | Bulk link templates to a plan with per-plan type/frequency |
| `updatePlanTemplate` | Update a link's type and frequency |
| `deletePlanTemplatesByPlanId` | Delete all links for a plan (plan rebuild) |
| **`chats.ts`** | |
| `createChat` | Create a chat (optional plan link + initial metadata snapshot) |
| `getChatById` | Chat by id, owner-scoped |
| `getLatestInProgressChat` | Most recent chat with `planId` null (the resumable draft chat) |
| `updateChatMetadata` | Overwrite chat metadata (single-slot latest-draft clipboard) |
| `updateChatPlanId` | Link a chat to its plan after approval |
| **`messages.ts`** | |
| `getMessagesByChatId` | All messages for a chat in creation order (LLM history) |
| `createMessage` | Persist one message and touch the chat's `updatedAt` |
