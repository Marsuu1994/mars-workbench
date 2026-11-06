# Board Flows

Flows for the kanban board page (`/kanban`) — landing, drag and drop, progress tracking, risk visuals (switched off), and the backlog.

---

## Landing Flow

### Trigger / Entry Point

User navigates to `/kanban`.

### Steps

1. Await `ensureSynced` (see `design/flows/shared.md`). No current-week `ACTIVE` plan → show the empty board → stop.
2. Return board data and render the kanban.

The empty board leads to creating this week's plan. A user whose last plan is `PENDING_UPDATE` (the week that just closed) first sees its recap — completion rate, tasks done, points; a user with no plan yet is asked to create their first.

---

## Drag and Drop Flow

### Trigger / Entry Point

User drags a task card to a different column.

### Steps

1. UI updates optimistically.
2. Server Action persists new status to DB.
3. On failure, UI rolls back to previous state.

### Rules

- The board has two columns, Todo · Done; work in progress stays in Todo.
- Allowed transitions: BACKLOG → TODO, BACKLOG → DONE (finished straight from the backlog) and TODO → DONE — forward only: the server refuses any move out of Done, so done points are append-only. `BACKLOG → TODO` is the backlog pull (drop onto the Todo column); see "Backlog Flow".
- `DOING` is no longer written; tasks that were `DOING` when the column went were moved to `TODO`.
- Project steps move like every other task.

---

## Progress Tracking Flow

### Trigger / Entry Point

Every board page load. The server computes the counts and point sums as part of `fetchBoard()`; the dashboard derives the percentages and the Daily Avg from them on the client.

### Steps

After sync, every read the board needs hangs off the active plan's id and runs in parallel, so the board loads in two database round trips: the sync's plan read, then the rest. Progress draws on three of them:

1. The plan's non-expired tasks. Today's total count and points sum the non-`BACKLOG` ones in memory.
2. One raw SQL aggregate over the plan's tasks computes every historical count and point sum with `FILTER` clauses — no in-memory aggregation for past data. Projection buckets (weekly-by-type, daily-past-by-`forDate`) count `BACKLOG` identically to `TODO`, so the Week projection includes backlog tasks unchanged.
3. The plan's current templates, from which future projections are derived in memory.

The client then turns the server's numbers into Today %, Week % and the Daily Avg, with no further read.

**Points derivation:** Each task stores a denormalized `points` field derived from `size` via `SIZE_TO_POINTS` at creation time. All DB aggregation operates on this column directly — no runtime size-to-points conversion needed.

### Metrics

**Today Ring** — circular progress ring showing task completion for the current day.

- Done count: `COUNT(*)` where `status = DONE` and `doneAt` falls on today in `KANBAN_TZ` (Los Angeles), whatever the server's timezone (from DB aggregate).
- Total count: number of non-`BACKLOG` tasks (in-memory).

**Today Points** — points earned today vs total points available on the board.

- Done points: `SUM(points)` where `status = DONE` and `doneAt` falls on today in `KANBAN_TZ` (from DB aggregate).
- Total points: `SUM(task.points)` across non-`BACKLOG` tasks (in-memory reduction).

**Week Points** — cumulative points earned this period vs projected period total.

- Done points: `SUM(points)` where `status = DONE` across the entire plan (from DB aggregate).
- Projected total: `dailyPastPoints + dailyFuturePoints + weeklyPoints + adhocPoints + projectPoints`
  - `dailyPastPoints` (DB): `SUM(points)` where `forDate < today` — points from daily tasks already generated on previous days.
  - `dailyFuturePoints` (in-memory): `SUM(sizeToPoints(size) × frequency)` over the plan's daily templates × remaining days. Remaining days follow the plan mode: NORMAL counts the weekdays left via `countWeekdaysInRange`, EXTREME every calendar day left (at least 1).
  - `weeklyPoints` (DB): `SUM(points)` where `type = WEEKLY`.
  - `adhocPoints` (DB): `SUM(points)` where `type = AD_HOC`.
  - `projectPoints` (DB): `SUM(points)` where `type = PROJECT`. Steps count in Today and Week like any task, and the Week projection includes the steps waiting in the backlog.

**Daily Avg** — rolling average of points earned per elapsed day.

- `weekDonePoints / daysElapsed` (client), where `daysElapsed` = days since the period's Monday, clamped 1–7 (server).

**Week Progress Bar** — percentage of projected task count completed this period.

- Done count: `COUNT(*)` where `status = DONE` across the plan (from DB aggregate).
- Projected total: same decomposition as Week Points but using task counts (`dailyPastCount + dailyFutureCount + weeklyCount + adhocCount + projectCount`).

### Rules

- Done points and done counts are append-only — they never decrease due to plan edits or template changes.
- Past effort is preserved regardless of template modifications.
- Future projection always reflects the current plan's active template snapshot.
- Today's tasks are counted in the future projection bucket only — never double-counted with past.

---

## Task Risky Level Visual Effect Flow

> **Switched off** — board cards render no risk since Phase 1. The rules below stay as a reference until per-kind risk rules return; see the Per-kind risk rules item in `design/tracker.md`.

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
- Thresholds will be revisited once auto-clear logic is implemented (see *Ad-hoc task deletion and auto-clear logic* in `design/tracker.md`).

---

## Backlog Flow

### Trigger / Entry Point

- **Desktop (`md+`):** A collapsed backlog strip sits on the right edge of the board. The user clicks it to expand the backlog panel.
- **Mobile (`< md`):** A peeking "Backlog" pill sits above the bottom tab bar. The user taps it to open a bottom sheet.

The backlog (desktop panel / mobile sheet) holds the plan's template-generated task instances with `status === BACKLOG` — the staging area they land in before reaching the board. It also holds the project steps scheduled this week. Ad-hoc tasks never appear in the backlog UI: while off the board they are also `BACKLOG`, but they live on the priority matrix (`planId = null`), outside the plan-scoped backlog query.

### Steps

#### Desktop

1. The collapsed strip shows the backlog count.

2. On expand, render the backlog tasks (`status === BACKLOG`) grouped: one group per habit (its template's staged instances) and one per project (its steps on this week), habits first, then projects. Within each, groups keep the column order — daily first, then by the group's earliest `createdAt` — and a group's tasks follow `instanceIndex` (copy number, step number). A group shows as one card for its next task, with how many wait behind it; a project's card opens the steps behind its next as a read-only list.

3. Drag a group's card onto the Todo column to move its next task to the board, or straight onto Done to finish it: optimistic update, then `updateTaskStatusAction(taskId, { status })`, rollback on failure. The task behind it becomes the group's next. The backlog takes no drops; no un-pull (forward-only, per "Drag and Drop Flow").

#### Mobile

1. The pill shows the backlog count; it is hidden entirely when the backlog is empty.
2. On tap, open a `modal-bottom` sheet (covers the tab bar as a standard modal; the board peeks behind the scrim). Render the same groups as full-width rows.
3. Tap a group's `↑ Todo` button to pull its next task: same optimistic `updateTaskStatusAction(taskId, { status: TODO })` + rollback. The sheet stays open for consecutive pulls; tap-to-pull replaces drag (a sheet over the board makes drag-out unreliable; backlog is forward-only anyway).

### Rules

- A pull always takes a group's next task — the habit's earliest staged instance, the project's lowest staged step — so a project's steps reach the board in order.
- The count (strip, panel, pill, sheet) is the number of staged tasks, not groups, capped in display past 8; its accessible name keeps the real number.
- Opening or closing a project's list never moves the backlog's scroll position: only the user's own scrolling does.
- A habit's week dots, computed from the loaded tasks, show each of the week's instances in order: a dot fills when its instance is done, and the card's own dot is ringed.
- The backlog open state (panel or sheet) is local UI state, default closed.
- Only the visible side of the desktop backlog can take focus: Tab and screen readers never reach the collapsed panel, or the strip while the panel is open. Opening moves focus to the panel's close control and closing moves it back to the strip; the first render leaves focus where it is.
- Empty backlog: desktop strip still shows (count `0`) with an empty-state body; the mobile pill is hidden (the sheet's empty state only appears if the last task is pulled while it is open).
