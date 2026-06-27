# Actions & Data Layer

## Principles

- Before adding a new action or endpoint, check if an existing one can be extended to cover the case.
- Keep handlers thin — validate input, call service, return result. No business logic inside handlers.
- One handler per logical operation, not per UI interaction. A single handler can cover multiple related mutations.
- If two flows share the same mutation, they share the same handler. Never duplicate handler logic.
- Use Server Actions for mutations triggered from Server or Client Components. Use API routes when you need webhooks, streaming, or third-party callbacks.

---

## Board

### `fetchBoard(): BoardData | null`

Called directly from the `/kanban` Server Component. Orchestrates sync checks and returns board data with pre-computed metrics.

```
BoardData {
  plan:               PlanWithTemplates
  tasks:              TaskItem[]          // Non-expired tasks only (TODO, DOING, DONE)
  todayDoneCount:     number
  todayTotalCount:    number
  todayDonePoints:    number
  todayTotalPoints:   number
  weekDoneCount:      number
  weekProjectedCount: number
  weekDonePoints:     number
  weekProjectedPoints:number
  daysElapsed:        number              // 1–7, Mon=1
}

BoardMetrics {                            // Returned by single raw SQL aggregate query
  todayDoneCount:     number
  todayDonePoints:    number
  weekDoneCount:      number
  weekDonePoints:     number
  dailyPastCount:     number
  dailyPastPoints:    number
  weeklyCount:        number
  weeklyPoints:       number
  adhocCount:         number
  adhocPoints:        number
}
```

**Pseudocode:**

```
today         = getTodayDate()
tomorrowStart = today + 1 day

// Two parallel queries — UI tasks + DB-level aggregates
[boardTasks, boardMetrics] = Promise.all([
  getBoardTasksByPlanId(planId),                          // non-EXPIRED tasks for UI
  getBoardMetricsByPlanId(planId, today, tomorrowStart),  // single SQL aggregate with FILTER clauses
])

// Today Ring — from DB aggregate
todayDoneCount  = boardMetrics.todayDoneCount
todayTotalCount = boardTasks.length

// Today Points — done from DB, total from board tasks
todayDonePoints  = boardMetrics.todayDonePoints
todayTotalPoints = boardTasks.sum(points)

// Week Projected (past daily instances + future daily projection + weekly + ad-hoc)
dailyPastPoints = boardMetrics.dailyPastPoints            // from DB
dailyPastCount  = boardMetrics.dailyPastCount

weekEnd       = getSundayFromPeriodKey(plan.periodKey)
remainingDays = plan.mode == NORMAL
  ? countWeekdaysInRange(today, weekEnd)                  // weekdays only
  : daysBetween(today, weekEnd) + 1                       // all calendar days

// pt.type is on PlanTemplate (not pt.template.type) — type lives at the plan-template level
currentDailyTemplates = plan.planTemplates.filter(pt => pt.type == DAILY)
dailyFuturePoints = currentDailyTemplates.sum(pt => sizeToPoints(pt.template.size) * pt.frequency) * remainingDays
dailyFutureCount  = currentDailyTemplates.sum(pt => pt.frequency) * remainingDays

weeklyPoints = boardMetrics.weeklyPoints                  // from DB
weeklyCount  = boardMetrics.weeklyCount
adhocPoints  = boardMetrics.adhocPoints                    // from DB
adhocCount   = boardMetrics.adhocCount

weekProjectedPoints = dailyPastPoints + dailyFuturePoints + weeklyPoints + adhocPoints
weekProjectedCount  = dailyPastCount  + dailyFutureCount  + weeklyCount  + adhocCount

weekDoneCount  = boardMetrics.weekDoneCount               // from DB
weekDonePoints = boardMetrics.weekDonePoints

// Days Elapsed
weekStart   = getMondayFromPeriodKey(plan.periodKey)
daysElapsed = clamp(daysBetween(weekStart, today) + 1, 1, 7)
```

---

## Plan Management

All actions follow the pattern: **validate with Zod → call service → `revalidatePath('/kanban')`**

### `createPlanAction(input)`

```
Input {
  periodType:    PeriodType     // "WEEKLY"
  description?:  string
  templates:     { templateId: string; type: TaskType; frequency: number }[]   // min 0 if adhocTaskIds provided
  adhocTaskIds?: string[]       // existing ad-hoc task IDs to link to this plan
}

Steps:
1. Validate input with Zod
2. Assert no existing ACTIVE plan for user
3. Create Plan record
4. Create PlanTemplate links with type and frequency for each entry
5. Generate task instances (stamping Task.type from PlanTemplate.type):
   - Weekly templates: generate all instances immediately
   - Daily templates: generate instances for today only
6. Link ad-hoc tasks: update Task.planId = newPlanId for each adhocTaskId
7. Unlink deselected ad-hoc tasks from PENDING_UPDATE plan: set planId = null
   for ad-hoc tasks on old plan NOT in adhocTaskIds
8. Set lastSyncDate = today
9. Archive existing PENDING_UPDATE plan → COMPLETED
10. revalidatePath('/kanban')
```

---

### `updatePlanAction(planId, input)`

```
Input {
  description?:  string
  templates?:    { templateId: string; type: TaskType; frequency: number }[]
  adhocTaskIds?: string[]       // ad-hoc task IDs to include in current plan
}

Steps:
1. Validate input with Zod
2. If templates provided:
   a. Diff against current PlanTemplate records:
      - added:    templateId in new set but not in current
      - removed:  templateId in current set but not in new
      - modified: templateId in both, but type or frequency changed
   b. For removed templates:
      - Delete Task instances where templateId IN removed set AND status IN (TODO, DOING)
      - Delete PlanTemplate records
   c. For modified templates:
      - Delete Task instances where templateId IN modified set AND status IN (TODO, DOING)
      - Update PlanTemplate record (new type and frequency)
      - Regenerate instances using new config:
        * Modified daily templates: generate for today only
        * Modified weekly templates: generate all instances immediately
   d. For added templates:
      - Create new PlanTemplate links with type and frequency
      - Generate instances:
        * Added daily templates: generate for today only
        * Added weekly templates: generate all instances immediately
   e. Set lastSyncDate = today
3. If description provided: update Plan.description
4. If adhocTaskIds provided:
   a. Link new: update Task.planId = planId for each adhocTaskId not currently linked
   b. Unlink removed: set Task.planId = null for ad-hoc tasks currently on plan
      but NOT in adhocTaskIds
5. revalidatePath('/kanban')
```

---

## Task Templates

### `createTaskTemplateAction(input)`

```
Input {
  title:        string
  description:  string
  size:         TaskSize    // EXTRA_SMALL | SMALL | MEDIUM | LARGE | EXTRA_LARGE
}

Steps:
1. Validate input with Zod
2. Create TaskTemplate record for current user
```

---

### `updateTaskTemplateAction(id, input)`

```
Input {
  title?:       string
  description?: string
  size?:        TaskSize
}

Steps:
1. Validate input with Zod (at least one field required)
2. Assert template belongs to current user
3. Update TaskTemplate record
```

---

## Tasks

### `updateTaskStatusAction(taskId, input)`

```
Input {
  status: TaskStatus    // TODO | DOING | DONE
}

Steps:
1. Validate input with Zod
2. Assert task belongs to user's active plan
3. Update Task.status
4. If status == DONE: set doneAt = now()
5. If status != DONE: clear doneAt
6. revalidatePath('/kanban')
```

---

### `createAdhocTaskAction(input)`

```
Input {
  title:        string
  description?: string
  size:         TaskSize    // EXTRA_SMALL | SMALL | MEDIUM | LARGE | EXTRA_LARGE
  status?:      TaskStatus   // TODO (default) or DOING — matches source column
}

Steps:
1. Validate input with Zod
2. Get active plan for user (must exist — button only visible on board)
3. Derive points from size via SIZE_TO_POINTS mapping
4. Create Task record:
   - planId = activePlan.id
   - templateId = null
   - type = AD_HOC
   - size = input.size
   - points = sizeToPoints(input.size)
   - status = input.status ?? TODO
   - forDate = null, periodKey = null
   - instanceIndex = 1
5. revalidatePath('/kanban')
```

---

### `countIncompleteByTemplateAction(planId, templateIds)`

```
Input {
  planId:      string
  templateIds: string[]
}

Steps:
1. Count TODO/DOING tasks grouped by templateId
2. Return Record<templateId, count>
```

Used by the edit plan UI to preview how many tasks will be removed per template before confirming changes.

---

## AI Chat (Planned)

### `getTemplateStatsAction(input)`

```
Input {
  planId:  string    // PENDING_UPDATE plan ID
}

Standalone action wrapping the getPlanTemplateStats DAL query. Also reused by the
chat-creation flow below. Exposed as an action so the UI can consume per-template
stats directly (e.g. future "Focus on low-completion tasks" contextual chips).

Steps:
1. Validate input with Zod
2. Call getPlanTemplateStats(planId) DAL query
3. Roll up perTemplate rows into overall aggregates (overall + daily-only completion
   rate, total points, completed/total counts)
4. Return { overall, perTemplate }
```

---

### `createAiChatAction(input)` — welcome (no LLM)

```
Input {
  planId?:  string    // PENDING_UPDATE plan ID (null for new users)
}

The first message is STATIC (no LLM) to avoid initial loading latency.

Steps:
1. If planId provided: fetch stats via getTemplateStatsAction → { overall, perTemplate }
2. Create Chat record linked to planId (or planId = null for new users)
3. Persist snapshot in Chat.metadata.lastPlanStats = { overall, perTemplate }
4. Build the first assistant message from a STATIC template (no LLM):
   - New user: fixed welcome explaining the planner
   - Returning user: interpolate lastPlanStats.overall into a static summary template
5. Persist the static message as the first assistant Message (type = TEXT)
6. Return { chatId, message, suggestionChips }   // chips are static, chosen by new vs returning
```

---

### `generateDraftPlanAction(input)`

```
Input {
  chatId:   string    // Existing chat ID
  message:  string    // User's text input
}

Steps:
1. Validate input with Zod
2. Persist user message as Message record
3. Fetch Chat with metadata (lastPlanStats, previous draftTemplates)
4. Fetch message history for the chat
5. Fetch all non-archived task templates for user
6. Build system prompt:
   - Include lastPlanStats.perTemplate from Chat.metadata (per-template completion /
     expired signal → keep, ease, or drop)
   - Include existing task templates (so LLM can reuse via templateId)
   - Include last rejected draftTemplates from Chat.metadata (if any)
7. Call LLM with structured output (response_format: json_schema):
   - Schema: { message: string, draftTemplates: DraftTemplate[], followUp: string }
   - DraftTemplate: { templateId: string|null, title, description, type, frequency, size: TaskSize }
8. Persist full structured JSON as assistant Message content with type = DRAFT_PLAN
9. Overwrite (not append) Chat.metadata.draftTemplates with response.draftTemplates —
   single-slot working clipboard; prior drafts live as DRAFT_PLAN Messages
10. Return the full structured response
```

---

## DAL Functions (Data Access Layer)

All Prisma queries live in `src/lib/db/`. Never import Prisma directly in actions or components.

### User scoping

Every owned read/write takes `userId` as its first argument and ANDs it into the
`where` (reads/ownership) or `data` (creates). `userId` is resolved only at the
entry boundary — actions and Server Component pages call
`getCurrentUserId()` (`src/lib/auth/getCurrentUserId.ts`, redirects to
`/auth/login` when unauthenticated) and pass it down; services and the DAL stay
auth-agnostic.

- **ID-based mutations** can't put a non-unique `userId` into a `update`/`findUnique`
  `where`, so they use `updateMany`/`updateManyAndReturn` filtered by `{ id, userId }`.
  A `count === 0` (or empty return) means not-found-or-not-owned → surfaced as an error.
  `updateTaskStatus` uses `updateManyAndReturn` (`UPDATE … WHERE … RETURNING`) to enforce
  ownership and return the row in one round trip.
- **`plan_templates`** has no `user_id`; it is scoped transitively — the service verifies
  parent-plan ownership (`getPlanWithTemplates(userId, planId)`) before mutating its links.
- The `tasks` raw-SQL metrics query also filters `user_id` as defense-in-depth.

### plans.ts

```
getActivePlan(userId)                                              // active plan for the user
getPlanByStatus(userId, status)                                    // find user's plan by status
getPlanWithTemplates(userId, planId)                               // owned plan + planTemplates; null = not found/owned (ownership gate)
createPlan(userId, data, tx?)                                      // create with ACTIVE status
updatePlan(userId, planId, data: { description?, mode? }, tx?)      // → { count }; owner-scoped via updateMany
updatePlanStatus(userId, planId, status, tx?)                       // → { count }; transition plan status
updateLastSyncDate(userId, planId, date, tx?)                       // set lastSyncDate (owner-scoped)
```

### planTemplates.ts

```
// No user_id column — callers must verify parent-plan ownership first.
getPlanTemplatesByPlanId(planId)                            // all plan-template links for a plan
createManyPlanTemplates(planId, templates[], tx?)           // bulk link templates with type + frequency
updatePlanTemplate(id, data: { type, frequency }, tx?)      // update a single link
deletePlanTemplatesByPlanId(planId, tx?)                    // bulk delete all links for a plan
```

### taskTemplates.ts

```
getTaskTemplates(userId)                                          // user's non-archived templates
getTaskTemplateById(userId, id)                                   // single owned template by ID
createTaskTemplate(userId, data: { title, description, size })     // create new template
updateTaskTemplate(userId, id, data: { title?, description?, size? })  // → { count }; owner-scoped via updateMany
```

### tasks.ts

```
// Board queries
getBoardTasksByPlanId(userId, planId)                               // non-EXPIRED tasks for UI rendering
getBoardMetricsByPlanId(userId, planId, todayStart, tomorrowStart)  // single raw SQL aggregate; filters user_id + plan_id

// General queries
getTasksByPlanId(userId, planId)                                    // ALL statuses; Task.type included
getTasksByPlanIdAndStatus(userId, planId, statuses[])               // filtered by status list
getDailyTasksForDate(userId, planId, templateId, forDate)           // idempotency check for daily sync
taskExists(userId, taskId)                                          // owned existence check
getNonDoneAdhocTasks(userId)                                        // user's non-DONE AD_HOC tasks (incl. planId = null)

// Mutations
createTask(userId, data: { ..., size, points })                    // single task instance; points derived from size via SIZE_TO_POINTS
createManyTasks(data: { userId, ..., size, points }[], tx?)        // batch create with skipDuplicates; each element carries userId
updateTaskStatus(userId, taskId, status)                            // → TaskItem | null; updateManyAndReturn, auto-sets/clears doneAt

// Expiry
expireStaleDailyTasks(userId, planId, cutoffDate, tx?)             // DAILY tasks where forDate < cutoffDate → EXPIRED
expireAllNonDoneTasks(userId, planId, tx?)                         // all non-DONE, non-AD_HOC → EXPIRED (end of period)

// Plan editing
deleteIncompleteTasksByTemplateIds(userId, planId, templateIds[], tx?)  // delete TODO/DOING tasks for templates
countIncompleteTasksByTemplateId(userId, planId, templateIds[])         // per-template TODO/DOING count (grouped)
countTasksByTemplateIds(userId, planId, templateIds[])                  // total removable count

// Ad-hoc task linking
updateTasksPlanId(userId, taskIds[], planId, tx?)                  // batch link to plan (owner-scoped)
unlinkAdhocTasksFromPlan(userId, planId, keepIds[], tx?)           // unlink AD_HOC tasks not in keepIds
```

### chatQueries.ts (Planned)

```
createChat(data: { userId, planId?, metadata? })           // create Chat record, planId optional for new users
getChatById(chatId)                                        // includes metadata
updateChatMetadata(chatId, metadata)                       // overwrite metadata (draftTemplates, lastPlanStats)
updateChatPlanId(chatId, planId)                            // link chat to plan after plan creation
```

### messageQueries.ts (Planned)

```
getMessagesByChatId(chatId)                                // ordered by createdAt, for LLM conversation history
createMessage(data: { chatId, role, content, type? })      // persist a single message, type defaults to TEXT
```

### planStatsQueries.ts (Planned)

```
getPlanTemplateStats(planId)   // per-template aggregates via GROUP BY templateId, status over Task
                               //   (planId-scoped, templateId NOT NULL → excludes ad-hoc):
                               //   { templateId, type, completed, expired, total, completionRate, pointsEarned }[]
                               // overall aggregates (overall + daily-only completion rate, total points)
                               // are derived in-memory from these rows by getTemplateStatsAction.
```
