# Baseline Design

## Goal

A tool to plan and track tasks within defined periods (e.g., weekly). It visualizes task progress on a drag-and-drop kanban board, helping users understand what's done, what's in progress, and what's been missed.

## Features

### Implemented

1. **Kanban board** — Three columns (Todo, Doing, Done) displaying task instances for the active plan. Tasks are ordered by type (daily first, then weekly) and creation time within each column.
2. **Drag and drop** — User can move tasks between columns: Todo -> Doing -> Done. Optimistic UI update + backend persistence.
3. **Plan creation** — User creates a weekly plan by selecting task templates. First-time users create new templates; returning users can load templates from their last plan.
4. **Task templates** — Reusable blueprints with title and description only. Type, frequency, and points are configured per-plan in PlanTemplate.
5. **Auto-generation** — After plan creation, generate all necessary task instances. Daily tasks are regenerated each day.
6. **Daily status recompute** — On first load each day, expire unfinished daily tasks older than yesterday and generate today's daily tasks. Idempotent. Yesterday's unfinished tasks carry over for one extra day with a distinct "rolled over" visual treatment.
7. **Points tracking** — Each task carries a point value. Today's total points are displayed on the board.
8. **Daily task rollover** — Unfinished daily tasks from yesterday roll over to the board for one extra day, shown with a "↩ Mon, Feb 23" date badge. Tasks older than yesterday are expired.
9. **Risk level visualization** — Tasks display color-coded risk badges (warning / danger) based on task type, time of day, days elapsed in the period, and completion progress.

### Planned: V2

1. Support Ad-hoc task type for one-off tasks (e.g. file tax report, get sinus CT).  Ad-hoc tasks are not tied to templates, never expire, and exist independently of plans.  They can be added to the board from the kanban page or carried over from previous plans.
2. Support evidence flow, when user move a task to completed, submit evidence.
3. Add AI generated tasks instance flow, LLM should be able to generate tasks based on past works + task template informatiosn to generate task instances, need to record the quality of task it generated.

### Planned: Future

- Backlog drawer — Expandable side panel for staging template-generated task instances before moving them to the board via drag-and-drop. Reduces visual clutter from duplicate cards. Mockup in `design/mockup/future-work/mockup-board-backlog-drawer-v2.html`.
- Support Ad-hoc task deletion and auto clear logic.
- Phone notifications for unfinished tasks
- LLM-generated motivational messages
- End-of-period summary before starting a new plan
- Weekly task rollover across periods
- Biweekly and custom period types
- Priorities page — Full-page Eisenhower priority matrix (Board/Priorities tab switcher) for organizing personal one-off tasks by urgency/importance. Tasks can be promoted to the board via "Track this week". Renames "Ad-hoc" to "Todo" badge, backlog drawer renamed to "Queued" — see `mockup/future-work/mockup-priorities-v2.html`
- Template categories — Add optional `category` field to TaskTemplate for grouping templates in the plan form. Collapsible groups + search for scalability. Mockups in `design/mockup/future-work/`.

## Entities

- **Plan** — A time-boxed container (e.g., one week) that groups task templates, their generated task instances, and/or Ad-hoc tasks. Only one plan can be active at a time. After the period ends, it becomes `PENDING_UPDATE` and serves as a template for the next plan.
- **TaskTemplate** — A reusable blueprint defining what kind of task to generate (title, points). Shared across plans. Editing a template does not affect already-generated Task instances.
- **PlanTemplate** — Join table linking a plan to its selected task templates, also indicates the type(daily, weekly) and frequency of generation.
- **Task** — A concrete instance generated from a template or user defined Ad-hoc tasks. This is what appears on the board and gets dragged between columns.
  - Daily task: has `forDate`, generated each day by daily sync
  - Weekly task: has `periodKey`, generated once at plan creation
  - Ad hoc task: can be generated anytime as needed, does not expire with time, does not associate with any task template, optional for associated with a plan

## Schema

### Plan

```prisma
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

```prisma
model TaskTemplate {
  id          String       @id @default(uuid())
  userId      String
  title       String
  description String       // Detailed description used for LLM prompt for task generation
  points      Int
  isArchived  Boolean      @default(false)  // Future: soft-delete
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

// Constraints:
// - userId references User (not implemented yet)
```

### PlanTemplate (join table)

```prisma
model PlanTemplate {
  id         String   @id @default(uuid())
  planId     String
  templateId String
  type       TaskType
  frequency  Int      // Frequency of task instance generation
  createdAt  DateTime @default(now())

  plan     Plan         @relation(fields: [planId], references: [id])
  template TaskTemplate @relation(fields: [templateId], references: [id])
}

enum TaskType {
  DAILY
  WEEKLY
  AD_HOC
}

// Constraints:
// - UNIQUE(planId, templateId)
```

### Task

```prisma
model Task {
  id            String       @id @default(uuid())
  planId        String? 		 // Optional for Ad-hoc tasks
  templateId    String? 		 // Optional for Ad-hoc tasks
  title         String
  description   String?
  type          TaskType
  points        Int
  status        TaskStatus
  forDate       DateTime?    // Set for daily tasks (the date this task is for)
  periodKey     String?      // Set for weekly tasks (e.g. "2026-W06")
  instanceIndex Int          // 1..frequency
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  doneAt        DateTime?

  plan     Plan?         @relation(fields: [planId], references: [id])
  template TaskTemplate? @relation(fields: [templateId], references: [id])
}

enum TaskStatus {
  TODO
  DOING
  DONE
  EXPIRED
}

// Constraints:
// - Daily tasks: UNIQUE(planId, templateId, forDate, instanceIndex)
// - Weekly tasks: UNIQUE(planId, templateId, periodKey, instanceIndex)
// - DAILY and WEEKLY tasks: planId is required (NOT NULL)
// - AD_HOC tasks: templateId is null, planId is optional(NULL = unassigned, not on the board), forDate and periodKey are both null, instanceIndex = 1
// - AD_HOC tasks do not expire
// - Exactly one of forDate or periodKey must be set for DAILY and WEEKLY tasks
```

## Architecture Decision

* Uses **Server Actions** for mutations and **direct DAL calls from Server Components** for data fetching. No REST API routes. Inputs are validated at the boundary with **Zod** schemas.
* Ad-hoc tasks are not associated with any TaskTemplate.  They are optionally associated with a plan (planId = null means unassigned backlog).