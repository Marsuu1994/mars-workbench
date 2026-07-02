# Baseline Design

## Goal

A tool to plan and track tasks within defined periods (e.g., weekly). It visualizes task progress on a drag-and-drop kanban board, helping users understand what's done, what's in progress, and what's been missed.

## Features

### Implemented

1. **Kanban board** — Three columns (Todo, Doing, Done) displaying task instances for the active plan. Tasks are ordered by type (daily first, then weekly) and creation time within each column.
2. **Drag and drop** — User can move tasks between columns: Todo -> Doing -> Done. Optimistic UI update + backend persistence.
3. **Plan creation** — User creates a weekly plan by selecting task templates. First-time users create new templates; returning users can load templates from their last plan.
4. **Task templates** — Reusable blueprints with title, description, and size (`TaskSize` enum: XS/S/M/L/XL). Type and frequency are configured per-plan in PlanTemplate.
5. **Auto-generation** — After plan creation, generate all necessary task instances. Daily tasks are regenerated each day.
6. **Daily status recompute** — On first load each day, expire unfinished daily tasks older than yesterday and generate today's daily tasks. Idempotent. Yesterday's unfinished tasks carry over for one extra day with a distinct "rolled over" visual treatment.
7. **Standardized sizing** — Tasks use a `TaskSize` enum (XS=1pt, S=2pt, M=3pt, L=5pt, XL=8pt) mapped to fibonacci points via `SIZE_TO_POINTS`. Points are denormalized on Task at creation time for efficient DB aggregation. Task cards display a green size chip (`M·3`). Template/ad-hoc modals use a full-width pill toggle selector (XS|S|M|L|XL) with effort hint text and L/XL split warning. Progress dashboard aggregates use the denormalized `points` column directly.
8. **Daily task rollover** — Unfinished daily tasks from yesterday roll over to the board for one extra day, shown with a "↩ Mon, Feb 23" date badge. Tasks older than yesterday are expired.
9. **Risk level visualization** — Tasks display color-coded risk badges (warning / danger) based on task type, time of day, days elapsed in the period, and completion progress.

10. **Ad-hoc tasks** — One-off tasks (e.g. file tax report, get sinus CT) not tied to templates. Never expire, exist independently of plans. Can be added to the board from the kanban page or carried over from previous plans.

### Implemented: V2

1. **Mobile Kanban + PWA app** — PWA manifest, service worker, mobile board mockups, bottom tab bar dock, safe-area insets for iOS/Android standalone mode.
2. **Workspace sidebar** — Sidebar redesigned from feature-level nav (Chat/Kanban) to kanban workspace nav (Board/Plan). Board disabled with tooltip when no active plan; Plan shows "New" nudge badge. Edit Plan button removed from board header (Plan entry in sidebar).
3. **LLM-assisted plan creation** — AI drafts a plan via non-streaming structured JSON output. User approves the batch (commit-as-is, the latest `DRAFT_PLAN` message is the approval source of truth) or rejects with text feedback to re-generate; no per-card editing. Static no-LLM welcome + suggestion chips. The chat is durable (DB-backed): it resumes the most recent unapproved chat across modal close / reload / restart and auto-resumes a generation interrupted mid-run. Approval atomically creates new TaskTemplates + the plan, completes the prior `PENDING_UPDATE` plan, and carries over ad-hoc tasks. See **AI Assisted Plan Creation Flow** in `flows.md`.
4. **Backlog drawer** — Collapsible right-edge panel (desktop) for staging template-generated task instances (`status = BACKLOG`) before pulling them onto the board via drag-and-drop (`BACKLOG → TODO`). Reduces visual clutter from duplicate (`frequency > 1`) cards. Reuses the board `TaskCard` (risk + rollover + `#n` instance badge stay in sync). Today ring/points count board tasks only; Week projection includes backlog. Mobile drawer is a follow-up. See the **Backlog Drawer Flow** in `flows.md` and the mockup at `design/mockup/mockup-board-backlog-drawer.html`.
5. **Priorities page (Eisenhower matrix)** — Full-page 2×2 priority matrix at `/kanban/priorities` (sidebar item + mobile dock tab) for organizing one-off `AD_HOC` tasks by urgency/importance (`Task.quadrant`, unassigned tasks are `BACKLOG` with `planId = null`). Cards drag freely between quadrants (reprioritize); "Track This Week" attaches a task to the current ACTIVE plan (`BACKLOG → TODO/DOING`) via a desktop send-button popover or a mobile bottom sheet; quadrant "Add" buttons reuse the ad-hoc task modal to create matrix tasks. Board-side ad-hoc creation is removed; deselecting an ad-hoc task from a plan returns it to the matrix (DONE tasks stay linked to preserve point history). See the **Priorities** flows in `flows.md` and `mockup/mockup-priorities.html`. Pending follow-ups: "Ad-hoc"→"Todo" badge and backlog-drawer→"Queued" renames, mockup back-port.

### Planned: V2

1. Support evidence flow, when user move a task to completed, submit evidence.
2. Add AI generated tasks instance flow, LLM should be able to generate tasks based on past works + task template informatiosn to generate task instances, need to record the quality of task it generated.

### Planned: Future

- Template categories — Add optional `category` field to TaskTemplate for grouping templates in the plan form. Collapsible groups + search for scalability. Mockups in `design/mockup/future-work/`.
- Expand the AI plan creation flow
  - Per-card select/unselect to keep/remove individual draft templates during AI plan creation.
  - Inline editing of size, type, frequency on draft template cards.
  - Ad-hoc task carryover in AI plan creation flow.
  - LLM-suggested plan mode (NORMAL/EXTREME).
- User-configurable timezone — Date utils are currently anchored to `America/Los_Angeles` via `KANBAN_TZ` constant. Consider making this a user setting stored in the database for multi-user support or if the user relocates.
- Support Ad-hoc task deletion and auto clear logic.
- Phone notifications for unfinished tasks
- LLM-generated motivational messages
- End-of-period summary before starting a new plan
- Weekly task rollover across periods
- Biweekly and custom period types
- Priorities-page renames (from the finalized matrix design, not yet applied): "Ad-hoc" task badge → "Todo" (blue), backlog drawer → "Queued" — see `mockup/mockup-priorities.html` board screen.
- AI-assisted plan editing — Use a new Chat linked to the same plan to suggest modifications via LLM. Separate from creation flow.

## Entities

- **Plan** — A time-boxed container (e.g., one week) that groups task templates, their generated task instances, and/or Ad-hoc tasks. Only one plan can be active at a time. After the period ends, it becomes `PENDING_UPDATE` and serves as a template for the next plan.
- **TaskTemplate** — A reusable blueprint defining what kind of task to generate (title, description, size). Shared across plans. Editing a template does not affect already-generated Task instances. Size is a standardized measurement of effort using the `TaskSize` enum, mapped to fibonacci points via `SIZE_TO_POINTS`:
  - XS (EXTRA_SMALL): 1 point, ~1 hour of effort
  - S (SMALL): 2 points, ~2 hours of effort
  - M (MEDIUM): 3 points, ~3 hours of effort
  - L (LARGE): 5 points, ~5 hours of effort. UI shows a warning hint suggesting the user consider splitting into smaller tasks, but does not prevent selection.
  - XL (EXTRA_LARGE): 8 points, ~8 hours of effort. UI shows a warning hint suggesting the user consider splitting into smaller tasks, but does not prevent selection.

- **PlanTemplate** — Join table linking a plan to its selected task templates, also indicates the type(daily, weekly) and frequency of generation.
- **Task** — A concrete instance generated from a template or user defined Ad-hoc tasks. This is what appears on the board and gets dragged between columns.
  - Daily task: has `forDate`, generated each day by daily sync
  - Weekly task: has `periodKey`, generated once at plan creation
  - Ad hoc task: can be generated anytime as needed, does not expire with time, does not associate with any task template, optional for associated with a plan. Lives on the priority matrix (`quadrant`, `planId = null`) until tracked onto the board
- **Chat** — A conversation session between the user and LLM for AI-assisted plan creation (and future edit). Each chat belongs to one plan. A plan can have multiple chats over its lifecycle. `Chat.metadata` stores the last plan stats snapshot (captured at creation) and `latestDraft` — the single-slot approval clipboard, overwritten on each generation. Every draft is also persisted as a `DRAFT_PLAN` message for history/rendering.
- **Message** — A single message from either the LLM or the user. Each message has a `type` field: `TEXT` for plain text (welcome messages, user input) or `DRAFT_PLAN` for structured draft responses (content is JSON with `{ message, description, draftTemplates, followUp }`). `DRAFT_PLAN` messages are rendered in the chat and replayed to the LLM as conversation history; the latest draft is also mirrored to `Chat.metadata.latestDraft` for approval.

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
  mode         PlanMode     @default(NORMAL)

  chats        Chat[]
}

enum PeriodType {
  WEEKLY     // Only supported type for MVP
}

enum PlanMode {
  NORMAL     // Generate daily tasks on weekdays only (skip weekends)
  EXTREME    // Generate daily tasks every day including weekends
}

enum PlanStatus {
  ACTIVE          // Current plan
  PENDING_UPDATE  // Period ended, available as template for next plan
  COMPLETED       // Archived after new plan is created
}

// Constraints:
// - userId references auth.users (Supabase Auth)
// - At most one ACTIVE or PENDING_UPDATE plan per user
// One Plan can have multiple chats (creation, future edits)
```

### TaskTemplate

```prisma
model TaskTemplate {
  id          String       @id @default(uuid())
  userId      String
  title       String
  description String       // Detailed description used for LLM prompt for task generation
  size      	TaskSize
  isArchived  Boolean      @default(false)  // Future: soft-delete
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum TaskSize {
	EXTRA_SMALL    // 1 point
	SMALL					 // 2 points
	MEDIUM				 // 3 points
	LARGE					 // 5 points
	EXTRA_LARGE    // 8 points
}

// SIZE_TO_POINTS mapping (canonical, used across the codebase):
// { EXTRA_SMALL: 1, SMALL: 2, MEDIUM: 3, LARGE: 5, EXTRA_LARGE: 8 }
// Points are always derived from size via this mapping at task creation time.

// Constraints:
// - userId references auth.users (Supabase Auth)
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
  userId        String       // Owner. Denormalized onto Task so ad-hoc tasks (planId = null) remain user-scoped without a plan to join through.
  planId        String? 		 // Optional for Ad-hoc tasks
  templateId    String? 		 // Optional for Ad-hoc tasks
  title         String
  description   String?
  type          TaskType
  size        	TaskSize
  points        Int          // Derived from size at creation time via SIZE_TO_POINTS mapping. Denormalized for efficient aggregation queries.
  status        TaskStatus
  forDate       DateTime?    // Set for daily tasks (the date this task is for)
  periodKey     String?      // Set for weekly tasks (e.g. "2026-W06")
  quadrant      PriorityQuadrant? // Set for AD_HOC tasks only — Eisenhower quadrant on the priority matrix
  instanceIndex Int          // 1..frequency
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  doneAt        DateTime?

  plan     Plan?         @relation(fields: [planId], references: [id])
  template TaskTemplate? @relation(fields: [templateId], references: [id])
}

enum TaskStatus {
  BACKLOG   // Not yet on the board: template instances staged in the backlog drawer, AD_HOC tasks on the priority matrix
  TODO
  DOING
  DONE
  EXPIRED
}

enum PriorityQuadrant {
  DO_FIRST     // Urgent & Important
  SCHEDULE     // Important, not urgent
  SQUEEZE_IN   // Urgent, not important
  MAYBE_LATER  // Neither urgent nor important
}

// Constraints:
// - userId references auth.users (Supabase Auth)
// - INDEX(userId, status) — idx_tasks_user_id_status
// - Daily tasks: UNIQUE(planId, templateId, forDate, instanceIndex)
// - Weekly tasks: UNIQUE(planId, templateId, periodKey, instanceIndex)
// - DAILY and WEEKLY tasks: planId is required (NOT NULL)
// - AD_HOC tasks: templateId is null, planId is optional(NULL = on the priority matrix, not on the board), forDate and periodKey are both null, instanceIndex = 1
// - AD_HOC tasks do not expire
// - quadrant is set for AD_HOC tasks only (null for DAILY/WEEKLY)
// - Exactly one of forDate or periodKey must be set for DAILY and WEEKLY tasks
// - BACKLOG means "not yet on the board" for every type. Template-generated instances (DAILY, WEEKLY)
//   are created as BACKLOG in the plan's backlog drawer and move to TODO when pulled onto the board.
//   AD_HOC tasks are created as BACKLOG on the priority matrix (planId = null) and move to TODO/DOING
//   when tracked ("Track This Week"); detaching from a plan resets them to BACKLOG. Status changes only
//   when a task crosses the BACKLOG↔board boundary — carry-over between plans re-points planId only.
```

### Chat

Reuse schema from chatbot, extended with `planId` for kanban integration.

```
model Chat {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String?   @map("user_id") @db.Uuid
  planId    String?   @map("plan_id") @db.Uuid
  title     String?
  metadata  Json?     // Stores lastPlanStats snapshot (at creation)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz
  messages  Message[]
  plan      Plan?     @relation(fields: [planId], references: [id])

  @@map("chats")
}
```

metadata shape for kanban AI chat:
```json
{
  "lastPlanStats": {
    "overall": {
      "completionRate": 0.75,
      "completedCount": 12,
      "totalCount": 16,
      "totalPoints": 47,
      "dailyCompletionRate": 0.90
    },
    "perTemplate": [
      {
        "templateId": "uuid",
        "title": "Solve 3 LeetCode problems",
        "type": "DAILY",
        "frequency": 1,
        "completed": 18,
        "expired": 2,
        "total": 20,
        "completionRate": 0.90,
        "pointsEarned": 54
      }
    ]
  },
  "latestDraft": {
    "description": "short summary of the week's focus",
    "draftTemplates": [
      {
        "templateId": "uuid" | null,
        "title": "string",
        "description": "string",
        "type": "DAILY" | "WEEKLY",
        "frequency": 1,
        "size": "MEDIUM"
      }
    ]
  }
}
```

`latestDraft` is the single-slot approval clipboard, overwritten on each draft
generation (commit-as-is). The full draft is also persisted as a `DRAFT_PLAN`
message for chat history/rendering; `metadata.latestDraft` is what the approval
action reads (it's already loaded with the chat, so no extra message query).

### Message

Reuse schema from chatbot, extended with `type` for structured message rendering.

```
model Message {
  id        BigInt        @id @default(autoincrement())
  chatId    String        @map("chat_id") @db.Uuid
  role      MessageRole
  type      MessageType   @default(TEXT)
  content   String
  createdAt DateTime      @default(now()) @map("created_at") @db.Timestamptz
  chat      Chat          @relation(fields: [chatId], references: [id], onDelete: Cascade)

  @@index([chatId, createdAt], name: "idx_messages_chat_id_created_at")
  @@map("messages")
}

enum MessageType {
  TEXT          // Plain text (welcome messages, user input)
  DRAFT_PLAN   // Structured draft: content is JSON { message, description, draftTemplates, followUp }
}
```

When `type = DRAFT_PLAN`, content shape:
```json
{
  "message": "Here's a structured plan...",
  "description": "short summary of the week's focus (used as Plan.description on approval)",
  "draftTemplates": [
    {
      "templateId": "uuid" | null,
      "title": "string",
      "description": "string",
      "type": "DAILY" | "WEEKLY",
      "frequency": 1,
      "size": "MEDIUM"
    }
  ],
  "followUp": "Want me to adjust?"
}
```

UI rendering: the latest `DRAFT_PLAN` message renders expanded with template cards. All prior `DRAFT_PLAN` messages render collapsed with an expand toggle.

## Architecture Decision

* Uses **Server Actions** for mutations and **direct DAL calls from Server Components** for data fetching. No REST API routes. Inputs are validated at the boundary with **Zod** schemas.
* Ad-hoc tasks are not associated with any TaskTemplate.  They are optionally associated with a plan (planId = null means unassigned backlog).
* **Size system** — `TaskSize` enum (EXTRA_SMALL → EXTRA_LARGE) replaces free-form integer points. Points are derived from size via `SIZE_TO_POINTS` constant and denormalized on the Task record at creation time. This keeps the raw SQL `SUM(points)` aggregation unchanged while the user-facing input is now a constrained enum. `TaskTemplate` stores only `size` (no `points` column); `Task` stores both `size` and `points`.
* **Size UI** — Task cards and template items display a shared `SizeChip` component (green chip: `M·3`). Template and ad-hoc creation modals use a full-width pill toggle selector with effort description text ("~3 hours of effort") and a warning hint for L/XL sizes. Client-safe enums (`TaskSize`, `SIZE_TO_POINTS`, `SIZE_LABELS`, `SIZE_EFFORT`) live in `features/kanban/utils/enums.ts` for use in `"use client"` components; server-side code uses `features/kanban/utils/sizeUtils.ts`.