# Actions & Data Layer

## Principles

- Before adding a new action or endpoint, check if an existing one can be extended to cover the case.
- Keep handlers thin — validate input, call service, return result. No business logic inside handlers.
- One handler per logical operation, not per UI interaction. A single handler can cover multiple related mutations.
- If two flows share the same mutation, they share the same handler. Never duplicate handler logic.
- Use Server Actions for mutations triggered from Server or Client Components. Use API routes when you need webhooks, streaming, or third-party callbacks.

## Data Fetching

### `fetchBoard(): BoardData | null`

Called directly from the `/kanban` Server Component.

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
```

**Pseudocode:**

```
today      = getTodayDate()
yesterday  = today - 1 day
allTasks   = getTasksByPlanId(planId)
boardTasks = allTasks.filter(t => t.status !== EXPIRED)

// Today Ring
todayDoneCount  = boardTasks.filter(t => t.status == DONE && sameDay(t.doneAt, today)).length
todayTotalCount = boardTasks.length

// Today Points
todayDonePoints  = boardTasks.filter(t => t.status == DONE && sameDay(t.doneAt, today)).sum(points)
todayTotalPoints = boardTasks.sum(points)

// Week Projected (past daily instances + future daily projection + weekly instances)
// Note: t.type is read directly from Task (not via template join) — Task stores type at generation time
dailyPastTasks    = allTasks.filter(t => t.type == DAILY && t.forDate < today)
dailyPastPoints   = dailyPastTasks.sum(points)
dailyPastCount    = dailyPastTasks.length

weekEnd           = getSundayFromPeriodKey(plan.periodKey)
remainingDays     = daysBetween(today, weekEnd) + 1   // today through Sunday inclusive

// pt.type is on PlanTemplate (not pt.template.type) — type lives at the plan-template level
currentDailyTemplates = plan.planTemplates.filter(pt => pt.type == DAILY)
dailyFuturePoints = currentDailyTemplates.sum(pt => pt.template.points * pt.frequency) * remainingDays
dailyFutureCount  = currentDailyTemplates.sum(pt => pt.frequency) * remainingDays

weeklyTasks       = allTasks.filter(t => t.type == WEEKLY)
weeklyPoints      = weeklyTasks.sum(points)
weeklyCount       = weeklyTasks.length

weekProjectedPoints = dailyPastPoints + dailyFuturePoints + weeklyPoints
weekProjectedCount  = dailyPastCount  + dailyFutureCount  + weeklyCount

weekDoneCount   = allTasks.filter(t => t.status == DONE).length
weekDonePoints  = allTasks.filter(t => t.status == DONE).sum(points)

// Days Elapsed
weekStart   = getMondayFromPeriodKey(plan.periodKey)
daysElapsed = clamp(daysBetween(weekStart, today) + 1, 1, 7)
```

---

## Server Actions

All actions follow the pattern: **validate with Zod → call service → `revalidatePath('/kanban')`**

---

### `createPlanAction(input)`

```
Input {
  periodType:   PeriodType     // "WEEKLY"
  description?: string
  templates:    { templateId: string; type: TaskType; frequency: number }[]   // min 1
}

Steps:
1. Validate input with Zod
2. Assert no existing ACTIVE plan for user
3. Create Plan record
4. Create PlanTemplate links with type and frequency for each entry
5. Generate task instances (stamping Task.type from PlanTemplate.type):
   - Weekly templates: generate all instances immediately
   - Daily templates: generate instances for today only
6. Set lastSyncDate = today
7. Archive existing PENDING_UPDATE plan → COMPLETED
8. revalidatePath('/kanban')
```

---

### `updatePlanAction(planId, input)`

```
Input {
  description?: string
  templates?:   { templateId: string; type: TaskType; frequency: number }[]
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
4. revalidatePath('/kanban')
```

---

### `createTaskTemplateAction(input)`

```
Input {
  title:        string
  description?: string
  points:       number    // positive integer
}
// type and frequency removed — these are configured per-plan in PlanTemplate

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
  points?:      number
}
// type and frequency removed — not stored on TaskTemplate

Steps:
1. Validate input with Zod (at least one field required)
2. Assert template belongs to current user
3. Update TaskTemplate record
```

---

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

## DAL Functions (Data Access Layer)

All Prisma queries live in `src/lib/db/`. Never import Prisma directly in actions or components.

```
planQueries.ts
  getActivePlan(userId)
  getPendingUpdatePlan(userId)
  createPlan(data)
  updatePlanStatus(planId, status)
  updateLastSyncDate(planId, date)

planTemplateQueries.ts
  getPlanTemplates(planId)
  createPlanTemplates(planId, templates: { templateId, type, frequency }[])   // type+freq per entry
  updatePlanTemplate(id, data: { type, frequency })                           // for modified entries
  deletePlanTemplates(planId, templateIds[])

taskTemplateQueries.ts
  getTaskTemplatesByUser(userId)
  createTaskTemplate(data)    // data: { title, description?, points } — no type or frequency
  updateTaskTemplate(id, data) // data: { title?, description?, points? }

taskQueries.ts
  getTasksByPlanId(planId)                                          // returns ALL statuses; Task.type included
  createTask(data)
  createTasks(data[])                                               // batch
  updateTaskStatus(taskId, status, doneAt?)
  deleteTasksByPlanAndTemplate(planId, templateId, statuses[])      // replaces expireTasks for edit plan flow
  expireStaleDailyTasks(planId, cutoffDate)                         // expire DAILY tasks where forDate < cutoffDate (= yesterday); excludes DONE
  expireTasks(taskIds[])                                            // batch status → EXPIRED; excludes AD_HOC type
```
