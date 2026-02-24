# Key Flows

### Landing Flow

**Trigger:** User navigates to `/kanban`

**Steps:**
1. Fetch active plan. If none exists, show "Create Plan" prompt → stop.
2. If current ISO week key differs from `plan.periodKey`, run End of Period Sync → return empty board with "Create Plan" prompt → stop.
3. If `plan.lastSyncDate` is earlier than today, run Daily Sync.
4. Return board data and render the kanban.

---

### Daily Sync Flow

**Trigger:** If `lastSyncDate` is earlier than today

**Steps:**
1. Set `lastSyncDate = today` first to prevent concurrent re-runs.
2. Expire all daily tasks where `forDate` is **strictly before yesterday** (i.e., `forDate < today - 1 day`) and status is not DONE.
3. Generate new daily task instances for today.

**Rules:**
- Idempotent — safe to re-run multiple times.
- Plan creation and template updates also set `lastSyncDate` to avoid redundant sync on next page load.
- **1-day rollover buffer:** tasks from yesterday are NOT expired on today's sync — they carry over and remain on the board for one extra day. They expire on the following day's sync.
- A task is considered **rolled over** when `task.type === DAILY && task.forDate < today`. This is computed in-memory; no schema change required.
- Rolled-over tasks are sorted after today's fresh daily tasks (but before weekly tasks) within each column.
- Rolled-over tasks display a distinct visual treatment on the task card to signal they are from a previous day (see `mockup-board.html`).

---

### End of Period Sync Flow

**Trigger:** If current ISO week key differs from `plan.periodKey`

**Steps:**
1. Expire all remaining non-DONE tasks instances except Ad-hoc tasks.
2. Set plan status: `ACTIVE` → `PENDING_UPDATE`.
3. Return null → board renders "Create Plan" prompt.

---

### Create Plan Flow

**Trigger:** User clicks "Create Plan" on empty board → navigates to `/kanban/plans/new`

**Steps:**
1. Page preloads PlanTemplates (with type and frequency config) from the `PENDING_UPDATE` plan if one exists (returning user), so user can reuse last week's configuration.
2. User adds, removes, or edits templates. First-time users create templates from scratch.
3. For each selected template, user configures type and frequency. Points come from TaskTemplate directly and are not configurable per-plan.
4. User submits.
5. Create plan and link selected templates.
6. Generate task instances: weekly tasks immediately, daily tasks for today only.
7. Set `lastSyncDate = today`.
8. Archive any existing `PENDING_UPDATE` plan → `COMPLETED`.
9. Revalidate `/kanban` to render board.

---

### Update Plan Flow

**Trigger:** User clicks "Edit Plan" on board header → navigates to `/kanban/plans/[id]`

**Steps:**
1. User edits template selection and/or type and frequency for a choosen template .
2. On submit, show confirmation modal summarizing the changes(added, removed, modified)
3. User click confirm and regenerate button.
4. Apply template changes and regenerate tasks accordingly.
5. Revalidate `/kanban` to render updated board.

**Rules:**

- DONE and EXPIRED tasks are never touched regardless of change type.
- Changes are applied per-template, unaffected templates are fully preserved.
- Task regeneration logic
  - Added templates: generate new instances (weekly immediately, daily for today only).
  - Removed templates: delete TODO and DOING instances for that template.
  - Modified templates (type or frequency changed): delete TODO and DOING instances   for that template and regenerate based on new config.

---

### Drag and Drop Flow

**Trigger:** User drags a task card to a different column

**Steps:**
1. UI updates optimistically.
2. Server Action persists new status to DB.
3. On failure, UI rolls back to previous state.

**Rules:**
- Allowed transitions: TODO → DOING → DONE only (no backwards movement).

---

### Progress Tracking Flow

**Trigger:** Computed server-side on every board page load, derived from a single DB query — no additional queries needed

**Steps:**

1. Fetch all tasks for the active plan.
2. Derive all metrics in-memory and return as part of `BoardData`.

**Metrics:**

**Today Ring** — circular progress showing how many tasks are done today
- Done count: tasks with status DONE and completed today
- Total count: all non-expired board tasks (TODO + DOING + DONE)

**Today Points** — points earned today vs available today
- Done points: sum of points from tasks completed today
- Total points: sum of points from all non-expired board tasks

**Week Points** — points earned this week vs projected total
- Done points: sum of points from all DONE tasks in the plan
- Projected total: past daily task points + future daily projection from current templates + all weekly task points

**Daily Avg** — average points earned per day since the plan started
- weekDonePoints / number of days elapsed since Monday (1–7)

**Week Progress Bar** — percentage of projected tasks completed this week
- Done count: all DONE tasks in the plan
- Projected total: past daily task count + future daily projection from current templates + all weekly task count

**Rules:**
- Done points and done count are append-only — never decrease due to plan changes.
- Past effort is preserved regardless of template edits.
- Future projection always reflects the current plan's template snapshot.
- Today is counted in the future projection only — never double-counted.

---

### Ad-hoc task flow

TBD

---

### Task Risky Level Visual Effect Flow

**Trigger:** Computed client-side on every board render, based on `forDate`, task status, and current time to calculate the risky level (warning, dangerous).

**Steps:**

1. Fetch all tasks for the active plan.

2. Derive risky level based on below formula all tasks and return as part of `BoardData`.

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
   - TODO, `daysElapsed >= 5` or `remainingDays <= remainingTasks × 1` → Danger
   - DOING, `daysElapsed >= 5` or `remainingDays <= remainingTasks × 1` → Warning
   - DOING → never Danger

**Rules:**

* `remainingTasks = frequency - doneCount - doingCount` (completed + in-progress instances this week for the same template)
* `remainingDays = 7 - daysElapsed` (days remaining until end of week)
* Danger takes priority over Warning when multiple conditions are met
* Risk level only escalates, never regresses (rollover tasks maintain at minimum Warning)
* DONE, EXPIRED tasks never trigger any risk indicator