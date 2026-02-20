# Kanban Style Period Planner

## Goal

A tool to plan and track tasks within defined periods (e.g., weekly). It visualizes task progress on a drag-and-drop kanban board, helping users understand what's done, what's in progress, and what's been missed.

## Features

### MVP

1. **Kanban board** — Three columns (Todo, Doing, Done) displaying task instances for the active plan. Tasks are ordered by type (daily first, then weekly) and creation time within each column.
2. **Drag and drop** — User can move tasks between columns: Todo -> Doing -> Done. Optimistic UI update + backend persistence.
3. **Plan creation** — User creates a weekly plan by selecting task templates. First-time users create new templates; returning users can load templates from their last plan.
4. **Task templates** — Reusable templates with title, description, points, type (daily/weekly), and frequency. CRUD operations available during planning.
5. **Auto-generation** — After plan creation, generate all necessary task instances. Daily tasks are regenerated each day.
6. **Daily status recompute** — On first load each day, expire unfinished daily tasks from previous days and generate today's daily tasks. Idempotent.
7. **Points tracking** — Each task carries a point value. Today's total points are displayed on the board.

### Future

- Task overlap visualization (stacked cards for multiple instances)
- Rollover badge for daily tasks carried from previous days
- Risk indicators (red/yellow) for tasks at risk of not being completed
- Phone notifications for unfinished tasks
- LLM-generated motivational messages
- End-of-period summary before starting a new plan
- Weekly task rollover across periods
- Biweekly and custom period types

## Entities

- **Plan** — A time-boxed container (e.g., one week) that groups task templates and their generated task instances. Only one plan can be active at a time.
- **TaskTemplate** — A reusable blueprint defining what kind of task to generate (title, points, type, frequency). Shared across plans.
- **PlanTemplate** — Join table linking a plan to its selected task templates.
- **Task** — A concrete instance generated from a template. This is what appears on the board and gets dragged between columns.

## Key Flows

### Landing Flow

1. User navigates to `/kanban`.
2. Fetch active plan. If none exists, show "Create Plan" prompt.
3. If active plan exists, check `lastSyncDate` vs today. If stale, run daily sync: expire stale tasks, generate today's daily tasks.
4. Return board data and render the kanban.

### Drag and Drop Flow

1. Board displays three columns: Todo, Doing, Done.
2. User drags a task card to a different column.
3. UI updates optimistically. Server Action updates task status in the backend.

### Create Plan Flow

1. User enters planning mode.
2. First-time: create new task templates (title, description, points, type, frequency).
3. Returning: load templates from the previous plan (pending_update status), add/remove/edit as needed.
4. Submit: Server Action creates the plan, generates task instances for today, calls `revalidatePath('/kanban')` to trigger page re-render with fresh board data.

### Daily Sync Flow

Sync logic lives in `runDailySync(planId, today)` — a standalone function reusable by a future cron job. The page-render function `fetchBoard()` checks `plan.lastSyncDate` vs today and only calls `runDailySync` if stale.

**Skip check:**
- `fetchBoard()` compares `plan.lastSyncDate` with today. If already synced, skips directly to fetching board data.

**Status recompute (inside `runDailySync`):**
- Daily tasks where `forDate < today` and status is not `done` -> move to `expired`.

**End of period (automatic detection in `fetchBoard()`):**
- Before running daily sync, `fetchBoard()` checks `getISOWeekKey(today) !== plan.periodKey`.
- If the period has ended, calls `runEndOfPeriodSync(planId)` — a standalone function reusable by a future cron job.
- `runEndOfPeriodSync` expires all remaining non-done tasks (daily and weekly) via `expireAllNonDoneTasks()`.
- Plan status changes from `active` to `pending_update` (available as template for next plan).
- `fetchBoard()` returns null → EmptyBoard renders with "Create Plan" prompt.

**Returning user (create plan with preselection):**
- The create plan page (`/kanban/plans/new`) fetches the `PENDING_UPDATE` plan and preselects its templates via `initialSelectedIds`.
- User can add/remove/edit templates before submitting.
- After new plan creation, `createPlanAction` archives the old `PENDING_UPDATE` plan to `COMPLETED`.

**Task generation (inside `runDailySync`):**
- Sets `lastSyncDate` first to prevent concurrent re-runs.
- For each daily template in the active plan, generate task instances for today.
- Idempotency key: `(plan_id, template_id, forDate, instance_index)`.
- Plan creation and template updates also set `lastSyncDate` to avoid redundant sync on next page load.

### Progress tracking flow

A progress dashboard sits between the board header and the kanban columns in a single row:

**Today Ring (left):** Circular SVG progress ring showing `todayDoneCount / todayTotalCount`. Label: "Today · {done} of {total} tasks". Color: success/green.
- `todayDoneCount`: tasks with `status = DONE` and `doneAt = today`
- `todayTotalCount`: all non-expired tasks on the board (TODO + DOING + DONE). These represent today's actionable work.

**Stat metrics (center, separated by dividers):**

1. **Today Points** — `{todayDonePoints} / {todayTotalPoints}` showing points earned today vs available today. Color: success/green.
2. **Week Points** — `{weekDonePoints} / {weekTotalPoints}`. Includes expired tasks in total. Color: info/blue.
3. **Daily Avg** — `weekDonePoints / daysElapsed` where `daysElapsed` is the number of days since the plan's week started (1–7). Color: warning/amber.

**Week Progress Bar (right, fills remaining space):** Horizontal bar with gradient fill (blue → green) showing `weekDoneCount / weekTotalCount` as a percentage. Label: "Week Progress · {done} of {total} tasks".
- `weekDoneCount`: all tasks with `status = DONE` in the plan
- `weekTotalCount`: ALL tasks in the plan (TODO + DOING + DONE + EXPIRED). Expired tasks count toward the total to reflect the full scope of work planned.

All metrics are computed server-side in `fetchBoard()` and returned as part of `BoardData`. No new database queries are needed — values are derived from the existing tasks array (which includes all statuses for counting, but only returns non-expired tasks for board rendering).

## Schema

### Plan

```
model Plan {
  id           String         @id @default(uuid())
  userId       String
  periodType   PeriodType
  periodKey    String         // ISO week key, e.g. "2026-W06"
  description  String?
  status       PlanStatus
  lastSyncDate DateTime?      // Date-only. Tracks last daily sync to skip redundant runs.
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

enum PeriodType {
  WEEKLY     // Only supported type for MVP
}

enum PlanStatus {
  ACTIVE          // Current plan
  PENDING_UPDATE  // Period ended, available as template for next plan
  COMPLETED       // Archived after new plan is created
}

// Constraints:
// - userId references User (not implemented yet)
// - At most one ACTIVE or PENDING_UPDATE plan per user
```

### TaskTemplate

```
model TaskTemplate {
  id          String       @id @default(uuid())
  userId      String
  title       String
  description String
  points      Int
  type        TaskType
  frequency   Int          // Number of instances per period
  isArchived  Boolean      @default(false)  // Future: soft-delete
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum TaskType {
  DAILY
  WEEKLY
}

// Constraints:
// - userId references User (not implemented yet)
```

### PlanTemplate (join table)

```
model PlanTemplate {
  id         String   @id @default(uuid())
  planId     String
  templateId String
  createdAt  DateTime @default(now())

  plan     Plan         @relation(fields: [planId], references: [id])
  template TaskTemplate @relation(fields: [templateId], references: [id])
}

// Constraints:
// - UNIQUE(planId, templateId)
```

### Task

```
model Task {
  id            String       @id @default(uuid())
  planId        String
  templateId    String
  title         String
  description   String?
  points        Int
  status        TaskStatus
  forDate       DateTime?    // Set for daily tasks (the date this task is for)
  periodKey     String?      // Set for weekly tasks (e.g. "2026-W06")
  instanceIndex Int          // 1..frequency
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  doneAt        DateTime?

  plan     Plan         @relation(fields: [planId], references: [id])
  template TaskTemplate @relation(fields: [templateId], references: [id])
}

enum TaskStatus {
  TODO
  DOING
  DONE
  EXPIRED
}

// Constraints:
// - Exactly one of forDate or periodKey must be set (daily vs weekly)
// - UNIQUE(planId, templateId, forDate, instanceIndex)   — daily tasks
// - UNIQUE(planId, templateId, periodKey, instanceIndex)  — weekly tasks
```

## Data Flow Architecture

Uses **Server Actions** for mutations and **direct DAL calls from Server Components** for data fetching. No REST API routes. Inputs are validated at the boundary with **Zod** schemas.

### Data Fetching (Server Component)

The `/kanban` page is a Server Component that calls `fetchBoard()` directly — no API route needed. This function:
1. Fetches the active plan via DAL. If none, returns null → EmptyBoard.
2. Checks if the period has ended (`getISOWeekKey(today) !== plan.periodKey`). If so, runs `runEndOfPeriodSync()` and returns null.
3. Checks `plan.lastSyncDate` vs today — only runs `runDailySync()` if stale.
4. Returns `BoardData | null` as props to client components.

```
BoardData {
  plan:            PlanWithTemplates   // Active plan with linked templates
  tasks:           TaskItem[]          // Non-expired tasks for board rendering (TODO, DOING, DONE)
  todayDoneCount:  number              // Tasks completed today (status=DONE, doneAt=today)
  todayTotalCount: number              // Board tasks (TODO + DOING + DONE)
  todayDonePoints: number              // Points from tasks completed today
  todayTotalPoints:number              // Points from all board tasks (TODO + DOING + DONE)
  weekDoneCount:   number              // DONE tasks in the plan
  weekTotalCount:  number              // ALL tasks (TODO + DOING + DONE + EXPIRED)
  weekDonePoints:  number              // Points from DONE tasks
  weekTotalPoints: number              // Points from ALL tasks (TODO + DOING + DONE + EXPIRED)
  daysElapsed:     number              // Days into the week (1–7), for daily avg
}
```

#### `fetchBoard()` computation details

Single DB query fetches all tasks via `getTasksByPlanId(planId)`, then filters in-memory:

```
today      = getTodayDate()
allTasks   = getTasksByPlanId(planId)
boardTasks = allTasks.filter(t => t.status !== EXPIRED)

// — Today Ring —
todayDoneCount  = boardTasks.filter(t => t.status == DONE && sameDay(t.doneAt, today)).length
todayTotalCount = boardTasks.length

// — Today Points (done / total for board tasks) —
todayDonePoints  = boardTasks.filter(t => t.status == DONE && sameDay(t.doneAt, today)).sum(points)
todayTotalPoints = boardTasks.sum(points)

// — Week Points (done / total including expired) —
weekDoneCount   = allTasks.filter(t => t.status == DONE).length
weekTotalCount  = allTasks.length
weekDonePoints  = allTasks.filter(t => t.status == DONE).sum(points)
weekTotalPoints = allTasks.sum(points)

// — Days Elapsed (for Daily Avg) —
weekStart   = getMondayFromPeriodKey(plan.periodKey)   // e.g. "2026-W06" → Feb 3
daysElapsed = daysBetween(weekStart, today) + 1        // Mon=1 … Sun=7, clamped to 1–7

// — Daily Avg (derived client-side or server-side) —
dailyAvg = weekDonePoints / daysElapsed
```

### Server Actions (Mutations)

All mutations follow the pattern: validate input with Zod → call DAL → `revalidatePath('/kanban')` to trigger page re-render. The page re-render re-runs `fetchBoard()`, so actions don't need to return board data.

#### `createPlanAction(input)`
Validates, checks no existing active plan, creates plan + links templates, generates initial tasks (weekly immediately, daily for today). Archives any `PENDING_UPDATE` plan to `COMPLETED`.
```
Input {
  periodType:   PeriodType        // "WEEKLY"
  description?: string
  templateIds:  string[]          // UUID array, min 1
}
```

#### `updatePlanAction(planId, input)`
Updates description and/or rebuilds template links. Regenerates tasks if templates changed.
```
Input {
  description?:  string
  templateIds?:  string[]
}
```

#### `createTaskTemplateAction(input)`
Creates a new reusable task template.
```
Input {
  title:       string
  description: string
  points:      number             // Positive integer
  type:        TaskType           // DAILY | WEEKLY
  frequency:   number             // Positive integer
}
```

#### `updateTaskTemplateAction(id, input)`
Updates an existing template. At least one field required.
```
Input {
  title?:       string
  description?: string
  points?:      number
  frequency?:   number
}
```

#### `updateTaskStatusAction(taskId, input)`
Updates task status (drag and drop). Auto-sets `doneAt` when moving to DONE.
```
Input {
  status: TaskStatus              // TODO | DOING | DONE
}
```
