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
1. Page preloads PlanTemplates (with type and frequency config) from the `PENDING_UPDATE` plan  if one exists (returning user) and all non-DONE Ad-hoc tasks associated with that plan, so user can reuse last week's configuration.
2. Page also preloads all non-DONE Ad-hoc tasks that doesn't associate with any plan from database.
3. For non-Ad-hoc task templates
   1. User adds, removes, or edits templates. First-time users create templates from scratch.
   2. For each selected template, user configures type and frequency. Points come from TaskTemplate directly and are not configurable per-plan.

4. For non-DONE Ad-hoc tasks
   1. non-Done Ad-hoc tasks from the `PENDING_UPDATE` plan will be preselected, user can deselect it to not include it to the coming plan.
   2. User can select any other non-Done Ad-hoc tasks to include it to the coming plan.

5. User submits.
6. Create plan and link selected templates and Ad-hoc tasks.
7. For Ad-hoc tasks from PENDING_UPDATE plan that were not selected: set planId = null (return to unassigned pool).
8. Generate task instances: weekly tasks immediately, daily tasks for today only.
9. Set `lastSyncDate = today`.
10. Archive any existing `PENDING_UPDATE` plan → `COMPLETED`.
11. Revalidate `/kanban` to render board.

---

### Update Plan Flow

**Trigger:** User clicks "Edit Plan" on board header → navigates to `/kanban/plans/[id]`

**Steps:**
1. Page preloads PlanTemplates (with type and frequency config) from the `ACTIVE` plan and all non-DONE Ad-hoc tasks from DB (Ad-hoc tasks associated with current plan will be preselected).
2. For non-Ad-hoc task: user edits template selection and/or type and frequency for a choosen template .
3. For Ad-hoc task: user select/deselect to include/exclude task from current plan, deselect will set the planId to null.
4. On submit, show confirmation modal summarizing the changes(added, removed, modified)
5. User click confirm and regenerate button.
6. Apply template changes and regenerate tasks accordingly.
7. Revalidate `/kanban` to render updated board.

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

### Ad-hoc Task Creation flow

**Trigger:** user click the create Ad-hoc task button from bottom of To do/In progress column triggers a modal to prompt creation flow.

**Steps:**

1. User fills in title, description, points and clicks "Add to board".
2. Generate the Ad-hoc task with status matching the source column (Todo → TODO, In Progress → DOING) and link it to the current plan.
3. UI state updates on success.

---

### Task Risky Level Visual Effect Flow

**Trigger:** Computed client-side on every board render, based on `forDate`, `createdAt`, task status, and current time to calculate the risky level (warning, dangerous).

**Steps:**

1. For each task in BoardData, compute risk level using current client time.

2. For each task, derive risk level based on the rules below and apply the corresponding visual treatment.

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
   
   - TODO, `daysElapsedSinceCreation >= 5`  → Warning
   - TODO, `daysElapsedSinceCreation >= 8` → Danger
   - DOING, `daysElapsedSinceCreation >= 8` → Warning
   - DOING → never Danger

**Rules:**

* `remainingTasks = frequency - doneCount - doingCount` (completed + in-progress instances this week for the same template)
* `remainingDays = 7 - daysElapsed` (days remaining until end of week)
* Danger takes priority over Warning when multiple conditions are met
* Risk level only escalates, never regresses (rollover tasks maintain at minimum Warning)
* DONE, EXPIRED tasks never trigger any risk indicator
* Ad-hoc task risk is based on days since creation(`daysElapsedSinceCreation`), not plan period. 
* Thresholds will be revisited once auto-clear logic is implemented (see Planned: Future).