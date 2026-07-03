# Board Flows

Flows for the kanban board page (`/kanban`) — landing, drag and drop, progress tracking, risk visuals, and the backlog drawer. Sibling docs: `design/flows/shared.md` (sync lifecycle), `design/flows/plan.md`, `design/flows/priorities.md`, `design/flows/auth.md`.

> **Doc convention:** One flow per `##` heading, separated by `---`. Every flow has two required `###` sections — `Trigger / Entry Point` and `Steps` — plus an optional `### Rules` section for constraints and invariants. Extra `###` sections (e.g. `Metrics`) are allowed only for reference material that fits neither Steps nor Rules.

---

## Landing Flow

### Trigger / Entry Point

User navigates to `/kanban`.

### Steps

1. Fetch active plan. If none exists, show "Create Plan" prompt → stop.
2. If current ISO week key differs from `plan.periodKey`, run End of Period Sync → return empty board with "Create Plan" prompt → stop.
3. If `plan.lastSyncDate` is earlier than today, run Daily Sync.
4. Return board data and render the kanban.

Steps 1–3 are the shared `ensureSynced` entry point — see the "Ensure Synced Flow" (plus the Daily Sync and End of Period Sync flows) in `design/flows/shared.md`.

---

## Drag and Drop Flow

### Trigger / Entry Point

User drags a task card to a different column.

### Steps

1. UI updates optimistically.
2. Server Action persists new status to DB.
3. On failure, UI rolls back to previous state.

### Rules

- Allowed transitions: BACKLOG → TODO → DOING → DONE only (no backwards movement). `BACKLOG → TODO` is the backlog drawer pull (drop onto the Todo column); see "Backlog Drawer Flow".
- Exception: the Priorities "Track This Week Flow" (see `design/flows/priorities.md`) may attach a matrix task directly as `BACKLOG → DOING` (tracked into the In Progress column).

---

## Progress Tracking Flow

### Trigger / Entry Point

Computed server-side on every board page load as part of `fetchBoard()`.

### Steps

Two parallel queries run after sync:

1. `getBoardTasksByPlanId` — all non-expired tasks for the plan (`BACKLOG/TODO/DOING/DONE`). Today's total count/points exclude `BACKLOG` (filtered in-memory, not a separate query/field).
2. `getBoardMetricsByPlanId` — a single raw SQL aggregate query that computes all historical counts and point sums using `FILTER` clauses. No in-memory aggregation for past data. Projection buckets (weekly-by-type, daily-past-by-`forDate`) count `BACKLOG` identically to `TODO`, so the Week projection includes backlog tasks unchanged.
3. Future projections are then derived in-memory from the plan's current templates.

**Points derivation:** Each task stores a denormalized `points` field derived from `size` via `SIZE_TO_POINTS` at creation time. All DB aggregation operates on this column directly — no runtime size-to-points conversion needed.

### Metrics

**Today Ring** — circular progress ring showing task completion for the current day.

- Done count: `COUNT(*)` where `status = DONE` and `doneAt` is within today (from DB aggregate).
- Total count: number of non-`BACKLOG` tasks (in-memory).

**Today Points** — points earned today vs total points available on the board.

- Done points: `SUM(points)` where `status = DONE` and `doneAt` is within today (from DB aggregate).
- Total points: `SUM(task.points)` across non-`BACKLOG` tasks (in-memory reduction).

**Week Points** — cumulative points earned this period vs projected period total.

- Done points: `SUM(points)` where `status = DONE` across the entire plan (from DB aggregate).
- Projected total: `dailyPastPoints + dailyFuturePoints + weeklyPoints + adhocPoints`
  - `dailyPastPoints` (DB): `SUM(points)` where `forDate < today` — points from daily tasks already generated on previous days.
  - `dailyFuturePoints` (in-memory): `SUM(template.points × frequency)` for all daily plan templates × remaining days. Remaining days respects plan mode: NORMAL counts only weekdays via `countWeekdaysInRange`, EXTREME counts all calendar days.
  - `weeklyPoints` (DB): `SUM(points)` where `type = WEEKLY`.
  - `adhocPoints` (DB): `SUM(points)` where `type = AD_HOC`.

  **Daily Avg** — rolling average of points earned per elapsed day.

- `weekDonePoints / daysElapsed`, where `daysElapsed` = days since the period's Monday (clamped 1–7).

**Week Progress Bar** — percentage of projected task count completed this period.

- Done count: `COUNT(*)` where `status = DONE` across the plan (from DB aggregate).
- Projected total: same four-part decomposition as Week Points but using task counts (`dailyPastCount + dailyFutureCount + weeklyCount + adhocCount`).

### Rules

- Done points and done counts are append-only — they never decrease due to plan edits or template changes.
- Past effort is preserved regardless of template modifications.
- Future projection always reflects the current plan's active template snapshot.
- Today's tasks are counted in the future projection bucket only — never double-counted with past.

---

## Task Risky Level Visual Effect Flow

### Trigger / Entry Point

Computed client-side on every board render, based on `forDate`, `createdAt`, task status, and current time to calculate the risky level (warning, dangerous).

### Steps

1. For each task in BoardData, compute risk level using current client time.
2. For each task, derive risk level based on the rules below and apply the corresponding visual treatment.

### Rules

**Daily Task — `forDate = today`**

- TODO, time < 20:00 → Normal
- TODO, time >= 20:00 → Warning
- DOING, time < 20:00 → Normal
- DOING, time >= 20:00 → Warning

**Daily Task — `forDate < today` (rollover)**

- TODO, time < 15:00 → Warning
- TODO, time >= 15:00 → Danger
- DOING, any time → Warning

**Weekly Task**

- TODO, `daysElapsed >= 3` or `remainingDays < remainingTasks × 2` → Warning
- TODO, `daysElapsed >= 5` or `remainingDays < remainingTasks × 1` → Danger
- DOING, `daysElapsed >= 5` or `remainingDays < remainingTasks × 1` → Warning
- DOING → never Danger

**Ad-hoc Task**

- TODO, `daysElapsedSinceCreation >= 5` → Warning
- TODO, `daysElapsedSinceCreation >= 8` → Danger
- DOING, `daysElapsedSinceCreation >= 8` → Warning
- DOING → never Danger

**General**

- `remainingTasks = frequency - doneCount - doingCount` (completed + in-progress instances this week for the same template)
- `remainingDays = 7 - daysElapsed` (days remaining until end of week)
- Danger takes priority over Warning when multiple conditions are met
- Risk level only escalates, never regresses (rollover tasks maintain at minimum Warning)
- DONE, EXPIRED tasks never trigger any risk indicator
- Ad-hoc task risk is based on days since creation (`daysElapsedSinceCreation`), not plan period.
- Thresholds will be revisited once auto-clear logic is implemented (see Planned: Future in `design/baseline.md`).

---

## Backlog Drawer Flow

### Trigger / Entry Point

- **Desktop (`md+`):** A collapsed backlog strip sits on the right edge of the board. The user clicks it to expand the drawer.
- **Mobile (`< md`):** A peeking "Backlog" pill sits above the bottom tab bar. The user taps it to open a bottom sheet.

The drawer/sheet holds the plan's template-generated task instances with `status === BACKLOG` — the staging area they land in before reaching the board. Ad-hoc tasks never appear in the drawer: while off the board they are also `BACKLOG`, but they live on the priority matrix (`planId = null`), outside the plan-scoped drawer query.

### Steps

#### Desktop

1. The collapsed strip shows the backlog count.

2. On expand, render the backlog tasks (`status === BACKLOG`) as a flat list, ordered like a column (daily then weekly, by `instanceIndex`/`createdAt`).

3. Drag a card onto the Todo column to move it to the board: optimistic update, then `updateTaskStatusAction(taskId, { status: TODO })`, rollback on failure. Todo is the only drop target; no un-pull (forward-only, per "Drag and Drop Flow").

#### Mobile

1. The pill shows the backlog count; it is hidden entirely when the backlog is empty.
2. On tap, open a `modal-bottom` sheet (covers the tab bar as a standard modal; the board peeks behind the scrim). Render the same backlog list as full-width rows.
3. Tap a card's `↑ Todo` button to pull it: same optimistic `updateTaskStatusAction(taskId, { status: TODO })` + rollback. The sheet stays open for consecutive pulls; tap-to-pull replaces drag (a sheet over the board makes drag-out unreliable; backlog is forward-only anyway).

### Rules

- Desktop reuses the board `TaskCard`; mobile uses `BacklogSheetCard` (full-width, non-draggable) with the same badge/instance/rollover/risk language. Risk computation treats `BACKLOG` as `TODO` so visuals match the board (see "Task Risky Level Visual Effect Flow").
- The `#{instanceIndex}` badge renders only when the template's `frequency > 1` (frequency-1 and ad-hoc tasks, always `instanceIndex = 1`, show none). The card reads `frequency` from `plan.planTemplates`.
- The drawer/sheet open state is local UI state, default closed.
- Empty backlog: desktop strip still shows (count `0`) with an empty-state body; the mobile pill is hidden (the sheet's empty state only appears if the last task is pulled while it is open).
