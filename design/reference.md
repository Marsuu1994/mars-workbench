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
| `completeTaskAction` | Mark a matrix task done in place (credits the current ACTIVE plan when one exists) | `matrixService.completeMatrixTask` |
| `undoCompleteTaskAction` | Undo a matrix completion within the toast window (restores the pre-complete status, detaches the plan link the complete added) | `matrixService.undoCompleteMatrixTask` |
| **`src/actions/projectActions.ts`** | | |
| `createProjectAction` | Create a project, optionally with its first steps | `projectService.createProject` |
| `updateProjectAction` | Rename a project / change its goal | `projectService.updateProject` |
| `archiveProjectAction` / `unarchiveProjectAction` | Archive (unfinished steps leave the week) / unarchive | `projectService.archiveProject` / `unarchiveProject` |
| `addProjectStepAction` | Append a step to a project's path | `projectService.addProjectStep` |
| `updateProjectStepAction` / `deleteProjectStepAction` | Edit / delete a step that isn't done | `projectService.updateProjectStep` / `deleteProjectStep` |
| `reorderProjectStepsAction` | Reorder a project's unfinished steps | `projectService.reorderProjectSteps` |
| `scheduleProjectStepAction` / `unscheduleProjectStepAction` | Put a step on this week / take back a step still in the backlog | `projectService.scheduleProjectStep` / `unscheduleProjectStep` |
| **`src/actions/settingsActions.ts`** | | |
| `updateThemeAction` | Persist the theme choice from the Settings overlay | SSR-readable cookie via `next/headers` (no service/DAL) |
| **`src/actions/dumpActions.ts`** | | |
| `createDumpEntryAction` | Quick Capture: insert one dump entry (storage-only, no side effects) | `db/dumpEntries.createDumpEntry` |
| `fetchDumpEntriesAction` | Load one dump feed page by opaque cursor (server-pinned page size) | `db/dumpEntries.getDumpEntriesPage` |
| **`src/actions/oauthActions.ts`** | | |
| `getConsentRequestAction` | Load one OAuth authorization request for `/oauth/consent` | `oauthConsentService.getConsentRequestByAuthorizationId` |
| `submitConsentDecisionAction` | Approve / deny a request, then redirect to the client (an undecidable one re-renders the page) | `oauthConsentService.submitConsentDecision` |

## MCP (src/mcp, served at /api/mcp)

Tools act for the user in `request.auth`, which `withMcpAuth` fills from a verified Supabase OAuth access token (`verifyMcpAccessToken`, `src/mcp/middleware/auth.ts`); in local dev a request without a token acts as `MCP_DEV_USER_ID`. A missing or invalid token gets a 401 pointing at `/.well-known/oauth-protected-resource/api/mcp`. Server instructions and tool descriptions: `src/mcp/prompts/`; error messages: `src/utils/errorMessages.ts`.

| Tool | Purpose | Calls |
| --- | --- | --- |
| `get_planning_context` | Snapshot to plan from: date/week, active or last plan (lines + progress, one-offs, totals), reusable templates | `planningService.getPlanningContext` |
| `create_plan` | Create this week's plan from existing + new templates, with a carry-over selection | `planningService.createPlanFromSpec` |
| `update_plan` | Patch this week's active plan (add / new / update / remove templates, drop one-offs, mode, description) | `planningService.patchActivePlan` |

## Services (src/services)

`syncService.ts` flow-level spec: [flows/shared.md](./flows/shared.md).

| Function | Purpose |
| --- | --- |
| **`boardService.ts`** | |
| `fetchBoard` | Board data + metrics for the active plan (null = no active plan) |
| `getEmptyBoardState` | Resolve the no-active-plan state (new user vs. finished-plan recap) |
| **`planService.ts`** | |
| `createPlan` | Create a plan from the plan form (templates, mode, ad-hoc and project-step links) |
| `updatePlan` | Rebuild an existing plan's templates/mode/ad-hoc and project-step links |
| `getPlanCreationContext` | Guard reads for every creation path: `ensureSynced` → active plan, pending plan, today, period key |
| `getCarryOverAdhocTaskIds` | The pending plan's non-done ad-hoc tasks (default carry-over when no explicit selection) |
| `getCarryOverProjectStepIds` | The pending plan's unfinished project steps (carry-over candidates) |
| `resolvePlanEntries` | Resolve existing + new (`templateId: null`) entries to template links, creating the new templates in the caller's transaction |
| `createPlanFromEntries` | Create a plan from entries mixing existing templates and new ones (`templateId: null`) — AI approval, MCP |
| `createPlanInTx` | Shared transactional plan-creation core reused by `createPlan`/`createPlanFromEntries`; rejects templates the user doesn't own; links the selected one-offs and steps, returns the pending plan's others |
| `updatePlanInTx` | Transactional plan-update core (template diff + task regeneration, ad-hoc and project-step links, description/mode); returns the applied diff |
| **`planningService.ts`** | |
| `getPlanningContext` | MCP read model, synced first: date/week, this week's ACTIVE or last PENDING_UPDATE plan (lines + progress, one-offs, totals), reusable templates |
| `createPlanFromSpec` | Guarded create from existing + new templates with a validated carry-over selection |
| `patchActivePlan` | Patch this week's ACTIVE plan only: patch → full template list (conflicts rejected) → `updatePlanInTx`, one transaction with any new templates |
| **`matrixService.ts`** | |
| `fetchPriorityMatrix` | Matrix tasks + active-plan info for `/kanban/priorities` |
| `trackTaskThisWeek` | Track This Week: pull a matrix task onto the board |
| `completeMatrixTask` | Complete a matrix task in place: `ensureSynced` → active plan id or null → DAL |
| `undoCompleteMatrixTask` | Undo a matrix completion: validated pre-complete snapshot → DAL |
| **`aiChatService.ts`** | |
| `getTemplateStats` | Last-plan per-template stats for the AI chat |
| `createAiChat` | Start a new AI plan-creation chat |
| `getActiveAiChat` | Load the resumable in-progress chat for rehydration |
| `generateDraftPlan` | Send a user message, generate/revise a draft plan |
| `resumeDraftPlan` | Regenerate after an interrupted LLM call (no new turn) |
| `approveDraftPlan` | Approve the latest draft and create the plan |
| **`projectService.ts`** | |
| `listProjects` / `getProject` | The user's projects (archived included) with their steps / one project, owner-scoped |
| `createProject` / `updateProject` | Create a project with optional first steps (one transaction) / rename, change goal |
| `archiveProject` / `unarchiveProject` | Archive: unfinished steps return to the project (done keep their plan) / unarchive |
| `addProjectStep` / `updateProjectStep` / `deleteProjectStep` | Append a step / edit or delete one that isn't done (delete moves later steps up) |
| `reorderProjectSteps` | Renumber the unfinished steps into the numbers they hold, in the given order |
| `scheduleProjectStep` / `unscheduleProjectStep` | `ensureSynced` → put a step on the active plan / take a backlog step back |
| **`oauthConsentService.ts`** | |
| `getConsentRequestByAuthorizationId` | Supabase authorization details → the consent page's request, a redirect (already consented), or null (unknown/expired/decided) |
| `submitConsentDecision` | Record approve/deny with Supabase; returns the client's redirect URL, or null when the request can't be decided |
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
| `completeAdhocTask` | Set an owned non-DONE AD_HOC task to DONE (+`doneAt`), filling a null `planId` with the active plan, in one write |
| `revertAdhocCompletion` | Put a DONE AD_HOC task back to its pre-complete status (clear `doneAt`, optional plan detach), guarded on DONE |
| `expireStaleDailyTasks` | Expire non-DONE daily tasks older than the cutoff (1-day rollover buffer) |
| `expireAllNonDoneTasks` | End-of-period cleanup: expire all non-done template instances (one-offs and steps never expire) |
| `getDailyTasksForDate` | Daily tasks for a specific date (idempotency check) |
| `taskExists` | Existence + ownership check |
| `deleteIncompleteTasksByTemplateIds` | Delete TODO/DOING tasks for given templates in a plan |
| `countTasksByTemplateIds` | Total incomplete-task count for given templates |
| `countIncompleteTasksByTemplateId` | Incomplete-task counts grouped by templateId |
| `getNonDoneAdhocTasks` | All non-DONE AD_HOC tasks (matrix data source) |
| `updateTasksPlanId` | Batch link ad-hoc tasks to a plan, owner-scoped |
| `unlinkTasksFromPlan` | Return a plan's unkept one-offs (to the matrix) or steps (to their project) — DONE tasks stay |
| `getPlanTemplateStats` | Per-template performance aggregates (LLM signal + recap stats) |
| `isValidTaskStatus` | TaskStatus type guard (with `VALID_TASK_STATUSES` const) |
| **`projects.ts`** | |
| `getProjectsWithSteps` / `getProjectWithStepsById` | Projects with their steps (ordered by step number); the by-id read doubles as the ownership gate |
| `createProject` / `updateProject` / `updateProjectArchived` | Project writes, owner-scoped |
| `getProjectStepById` | One step, owner-scoped |
| `createProjectSteps` | Insert numbered steps (off the week, BACKLOG) |
| `updateProjectStep` / `deleteProjectStep` | Edit / delete a step that isn't done |
| `shiftStepsAfterIndex` / `renumberProjectSteps` | Keep step numbers contiguous after a delete / reorder (one statement) |
| `scheduleProjectStep` / `unscheduleProjectStep` | Link an unscheduled step of a live project to a plan / unlink a backlog step |
| `linkProjectStepsToPlan` | Batch link unfinished steps to a plan (status kept) |
| `unlinkUnfinishedStepsByProjectId` | Archive: return a project's unfinished steps from any plan |
| `getUnfinishedStepIdsByPlanId` | A plan's unfinished steps (carry-over candidates) |
| **`taskTemplates.ts`** | |
| `getTaskTemplates` | Non-archived templates for a user, newest first |
| `getTaskTemplateTitlesByIds` | Map template ids → titles (includes archived, for stats labels) |
| `getOwnedTemplateIds` | The subset of ids the user owns (template-ownership check) |
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
| **`dumpEntries.ts`** | |
| `createDumpEntry` | Insert one dump entry (isProcessed defaults false) |
| `getDumpEntriesPage` | One owner-scoped feed page, (createdAt, id) DESC, cursor + take |
| `countDumpEntries` | Total entry count for the dump title bar |
