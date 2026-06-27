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
3. If today is a weekend day and plan mode is NORMAL, skip daily task generation.
4. Otherwise, generate new daily task instances for today.

**Rules:**
- Idempotent — safe to re-run multiple times.
- Plan creation and template updates also set `lastSyncDate` to avoid redundant sync on next page load.
- **1-day rollover buffer:** tasks from yesterday are NOT expired on today's sync — they carry over and remain on the board for one extra day. They expire on the following day's sync.
- A task is considered **rolled over** when `task.type === DAILY && task.forDate < today`. This is computed in-memory; no schema change required.
- Rolled-over tasks are sorted after today's fresh daily tasks (but before weekly tasks) within each column.
- Rolled-over tasks display a distinct visual treatment on the task card to signal they are from a previous day (see `mockup-board.html`).
- During weekends, daily task generation is skipped unless plan mode is EXTREME.
- Week projection formula adjusts for mode: NORMAL counts only remaining weekdays, EXTREME counts all remaining calendar days.

---

### End of Period Sync Flow

**Trigger:** If current ISO week key differs from `plan.periodKey`

**Steps:**
1. Expire all remaining non-DONE tasks instances except Ad-hoc tasks.
2. Set plan status: `ACTIVE` → `PENDING_UPDATE`.
3. Return null → board renders "Create Plan" prompt.

---

### Create Task Template Flow

**Trigger:** User clicks the "New Template" button on the plan form page.

**Steps:**

1. Open the template modal with empty fields for title, description, and size.
2. The size selector displays all available sizes (XS–XL) with their corresponding point values and hour estimates. Selecting L or XL shows an inline warning suggesting the user consider splitting into smaller tasks.
3. User completes the form and clicks "Create". Validate input via Zod schema, then persist the new TaskTemplate.
4. Revalidate the `/kanban/plans` route to reflect the new template in the plan form.

---

### Update Task Template Flow

**Trigger:** User clicks the edit button on an existing template card within the plan form page.

**Steps:**

1. Open the template modal pre-populated with the current title, description, and size.
2. User modifies any fields. The size selector behaves identically to the create flow (point labels, L/XL warning).
3. User clicks "Save". Validate input, then persist changes to the existing TaskTemplate.
4. Revalidate the `/kanban/plans` route to reflect the updated template.

**Note:** Editing a template does not retroactively change already-generated Task instances. Only future task generation uses the updated values.

---

### Create Plan Flow

**Trigger:** User clicks "Create Plan" on empty board → navigates to `/kanban/plans/new`

**Steps:**
1. Page preloads PlanTemplates (with type and frequency config) from the `PENDING_UPDATE` plan  if one exists (returning user) and all non-DONE Ad-hoc tasks associated with that plan, so user can reuse last week's configuration.
2. Page also preloads all non-DONE Ad-hoc tasks that doesn't associate with any plan from database.
3. For non-Ad-hoc task templates
   1. User adds, removes, or edits templates. First-time users create templates from scratch.
   2. For each selected template, user configures type and frequency. Size (and derived points) come from TaskTemplate directly and are not configurable per-plan.

4. For non-DONE Ad-hoc tasks
   1. non-Done Ad-hoc tasks from the `PENDING_UPDATE` plan will be preselected, user can deselect it to not include it to the coming plan.
   2. User can select any other non-Done Ad-hoc tasks to include it to the coming plan.

5. Toggle plan mode between NORMAL and EXTREME. Defaults to NORMAL.

6. User submits.
7. Create plan and link selected templates and Ad-hoc tasks.
8. For Ad-hoc tasks from PENDING_UPDATE plan that were not selected: set planId = null (return to unassigned pool).
9. Generate task instances: weekly tasks immediately, daily tasks for today only (respecting plan mode for weekend skipping).
10. Set `lastSyncDate = today`.
11. Archive any existing `PENDING_UPDATE` plan → `COMPLETED`.
12. Revalidate `/kanban` to render board.

---

### Update Plan Flow

**Trigger:** User clicks "Edit Plan" on board header → navigates to `/kanban/plans/[id]`

**Steps:**
1. Page preloads PlanTemplates (with type and frequency config) from the `ACTIVE` plan and all non-DONE Ad-hoc tasks from DB (Ad-hoc tasks associated with current plan will be preselected).
2. For non-Ad-hoc task: user edits template selection and/or type and frequency for a choosen template .
3. For Ad-hoc task: user select/deselect to include/exclude task from current plan, deselect will set the planId to null.
4. Toggle plan mode between NORMAL and EXTREME.
5. On submit, show confirmation modal summarizing the changes (added, removed, modified, mode change).
6. User clicks confirm and regenerate button.
7. Apply template changes and regenerate tasks accordingly (respecting plan mode for weekend skipping).
8. Revalidate `/kanban` to render updated board.

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

**Trigger:** Computed server-side on every board page load as part of `fetchBoard()`.

**Data fetching:** Two parallel queries run after sync:
1. `getBoardTasksByPlanId` — all non-expired tasks for the plan (used for board rendering and today's total count/points).
2. `getBoardMetricsByPlanId` — a single raw SQL aggregate query that computes all historical counts and point sums using `FILTER` clauses. No in-memory aggregation for past data.

Future projections are then derived in-memory from the plan's current templates.

**Points derivation:** Each task stores a denormalized `points` field derived from `size` via `SIZE_TO_POINTS` at creation time. All DB aggregation operates on this column directly — no runtime size-to-points conversion needed.

**Metrics:**

**Today Ring** — circular progress ring showing task completion for the current day.
- Done count: `COUNT(*)` where `status = DONE` and `doneAt` is within today (from DB aggregate).
- Total count: length of board tasks array (all non-expired tasks).

**Today Points** — points earned today vs total points available on the board.
- Done points: `SUM(points)` where `status = DONE` and `doneAt` is within today (from DB aggregate).
- Total points: `SUM(task.points)` across all board tasks (in-memory reduction).

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

**Rules:**
- Done points and done counts are append-only — they never decrease due to plan edits or template changes.
- Past effort is preserved regardless of template modifications.
- Future projection always reflects the current plan's active template snapshot.
- Today's tasks are counted in the future projection bucket only — never double-counted with past.

---

### Ad-hoc Task Creation flow

**Trigger:** user click the create Ad-hoc task button from bottom of To do/In progress column triggers a modal to prompt creation flow.

**Steps:**

1. User fills in title, description, size and clicks "Add to board".
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

---

### AI Assisted Plan Creation Flow

**Trigger:** User clicks the AI assistant button inside create plan page.

**Steps:**

1. **Open AI panel → create Chat**
   - Create a new Chat record linked to the target plan (planId on Chat). If no plan exists yet (new user), planId is null until plan creation.
   - Fetch **per-template performance stats** from the `PENDING_UPDATE` plan (if exists) via `getTemplateStatsAction` (backed by the `getPlanTemplateStats(planId)` DAL query — a single `GROUP BY templateId, status` over `Task`): per template `completed` / `expired` / `total` instances, `completionRate`, `pointsEarned`, and `type`. Roll these up into `overall` aggregates (overall + daily-only completion rate, total points) for the welcome message — overall completion alone is weak signal, so the per-template breakdown is what the LLM uses to decide which templates to keep, ease, or drop.
   - Fetch all non-archived task templates for the user (reuse list for `templateId` matching — kept **separate** from `perTemplate`, since it includes templates never used in a plan).
   - Persist the stats snapshot in `Chat.metadata.lastPlanStats` (`{ overall, perTemplate }`). **Decision: yes, persist as a snapshot** — computed once at chat creation and reused by both the static welcome (`overall`) and every `generateDraftPlanAction` prompt (`perTemplate`), avoiding re-aggregation on each iteration. The `PENDING_UPDATE` plan is not mutated during the chat, so the snapshot stays consistent for the whole session.

2. **Generate welcome message** (handled by `createAiChatAction` from step 1 — chat creation + static welcome are one action)

   **Update: No LLM for the first message to avoid latency**

   - New user (no PENDING_UPDATE plan): Brief welcome explaining how the planner works and prompting the user to describe their goals.
   - Returning user: A friendly summary of last week's performance, built by interpolating `lastPlanStats.overall` into a static template (e.g. "You completed 12 of 16 tasks (75%) and earned 47 points. Your daily habits hit 90%."), then asks about goals for the coming week. No LLM.
   - ~~Inject stats + existing templates into the system prompt as context (no tool calling).~~ 
   - ~~Persist as the first assistant Message. No streaming — regular request/response.~~
   - **Suggestion chips:** Displayed below the welcome message as quick-start prompts. These are **static hardcoded templates**, not LLM-generated, to avoid extra latency and ensure instant rendering.
     - New user set: `["I'm preparing for tech interviews", "Help me build a fitness routine", "I want to learn a new skill"]`
     - Returning user set: `["Keep the same plan", "Adjust difficulty", "Try something new"]`
     - Swap set based on whether a `PENDING_UPDATE` plan exists.
     - Clicking a chip populates the input field and submits as a user message (step 3).
     - Future: contextual chips derived from stats (e.g., "Focus on low-completion tasks").

3. **User inputs requirements/from suggestions chip**

   - User describes their goals in natural language.
   - Persist as a user Message.

4. **Generate draft plan** (`generateDraftPlanAction`)
   - Call LLM with structured output (`response_format: json_schema`). The **static** system prompt includes: per-template performance (`lastPlanStats.perTemplate`, with `frequency` snapshotted) so the model keeps high-completion templates and eases/drops abandoned (high `expired`) ones, plus existing task templates (reuse list). Prior drafts are **not** injected into the prompt — they reach the model through the replayed message history (each `DRAFT_PLAN` turn's full JSON content), with the user's rejection as the following turn.
   - LLM returns structured JSON:

   ```json
   {
     "message": "Here's a structured plan for your FAANG prep...",
     "draftTemplates": [
       {
         "templateId": "uuid-or-null",
         "title": "Solve 3 LeetCode problems",
         "description": "Focus on medium-level DP, graph, and sliding window problems.",
         "type": "DAILY",
         "frequency": 1,
         "size": "MEDIUM"
       }
     ],
     "followUp": "That's 5 templates totaling ~16 points/day. Want me to adjust?"
   }
   ```

   - Persist full structured JSON as assistant Message content with `type = DRAFT_PLAN`. **This message is the pending-approval draft** (commit-as-is) — the approval action reads the latest `DRAFT_PLAN` message. **Decision: the draft is not mirrored into `Chat.metadata`** — the Messages already hold every draft (the latest is the approval target, priors are LLM history), so a metadata copy would just duplicate that. `Chat.metadata` holds only the `lastPlanStats` snapshot.
   - No streaming — show loading state, render full response at once.
   - UI renders the latest `DRAFT_PLAN` message expanded: plain text → read-only template cards → follow-up text. Prior `DRAFT_PLAN` messages render collapsed with expand toggle.

5. **Iterate or approve**
   - **Reject:** User provides text feedback → persist as user Message → redo step 4. The LLM sees prior drafts and the rejection through the full message history (no separate metadata read).
   - **Approve:** User clicks "Approve & Create Plan" → proceed to step 6.
   - V1: static wizard only. User cannot select/unselect or edit individual cards.

6. **Post-approval: create plan**
   - Read the draft from the latest `DRAFT_PLAN` message (the approval source of truth).
   - For each entry where `templateId` is null: call `createTaskTemplateAction` to create a new TaskTemplate, get back real templateId.
   - Map all entries to `{ templateId, type, frequency }[]`.
   - Call existing `createPlanAction` with the resolved templates array.
   - Update `Chat.planId` to the newly created plan (if it was null).

   **Error handling:** If the LLM returns an error or unusable output, show an error message in the chat bubble. No retry logic for V1.

#### LLM Configuration

##### Prompt Strategy

All data is fetched server-side and injected into the LLM system prompt as context. No tool calling.

- **Stats from last plan:** Per-template performance (completed / expired / total, completion rate, points earned, type) fetched via `getTemplateStatsAction` (backed by the `getPlanTemplateStats` DAL query), rolled up to `overall` aggregates. Stored as a snapshot in `Chat.metadata.lastPlanStats` (`{ overall, perTemplate }`). `overall` drives the static welcome; `perTemplate` is the LLM's signal for which templates to keep, ease, or drop.
- **Existing task templates:** All non-archived templates for the user, so LLM can reuse existing ones (returning `templateId`) or suggest new ones (`templateId: null`).
- **Prior drafts:** Replayed as conversation history (each `DRAFT_PLAN` message's full JSON content), so the model sees its previous proposals and the user's rejection feedback in order — no separate "last draft" injection into the system prompt.

#### LLM Calls

- `generateDraftPlanAction`: Generates a draft plan. Input: user message + stats + templates + last draft. Output: structured JSON (`message`, `draftTemplates`, `followUp`). Called multiple times during iteration.