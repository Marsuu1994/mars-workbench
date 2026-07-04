# Plan Flows

Flows for the plan pages (`/kanban/plans/new`, `/kanban/plans/[id]`) — task template management, plan create/update, and AI-assisted plan creation. Sibling docs: `design/flows/board.md`, `design/flows/priorities.md`, `design/flows/shared.md`, `design/flows/auth.md`.

> **Doc convention:** One flow per `##` heading, separated by `---`. Every flow has two required `###` sections — `Trigger / Entry Point` and `Steps` — plus an optional `### Rules` section for constraints and invariants. Extra `###` sections (e.g. `Metrics`) are allowed only for reference material that fits neither Steps nor Rules.

---

## Create Task Template Flow

### Trigger / Entry Point

User clicks the "New Template" button on the plan form page.

### Steps

1. Open the template modal with empty fields for title, description, and size.
2. The size selector displays all available sizes (XS–XL) with their corresponding point values and hour estimates. Selecting L or XL shows an inline warning suggesting the user consider splitting into smaller tasks.
3. User completes the form and clicks "Create". Validate input via Zod schema, then persist the new TaskTemplate.
4. Revalidate the `/kanban/plans` route to reflect the new template in the plan form.

---

## Update Task Template Flow

### Trigger / Entry Point

User clicks the edit button on an existing template card within the plan form page.

### Steps

1. Open the template modal pre-populated with the current title, description, and size.
2. User modifies any fields. The size selector behaves identically to the create flow (point labels, L/XL warning).
3. User clicks "Save". Validate input, then persist changes to the existing TaskTemplate.
4. Revalidate the `/kanban/plans` route to reflect the updated template.

### Rules

- Editing a template does not retroactively change already-generated Task instances. Only future task generation uses the updated values.

---

## Create Plan Flow

### Trigger / Entry Point

User clicks "Create Plan" on empty board → navigates to `/kanban/plans/new`.

### Steps

1. Page preloads PlanTemplates (with type and frequency config) from the `PENDING_UPDATE` plan if one exists (returning user) and all non-DONE Ad-hoc tasks associated with that plan, so user can reuse last week's configuration. Unassigned Ad-hoc tasks are not offered here — they live on the priority matrix and reach the board via the "Track This Week Flow" (see `design/flows/priorities.md`).
2. For non-Ad-hoc task templates
   1. User adds, removes, or edits templates. First-time users create templates from scratch.
   2. For each selected template, user configures type and frequency. Size (and derived points) come from TaskTemplate directly and are not configurable per-plan.
3. For non-DONE Ad-hoc tasks from the `PENDING_UPDATE` plan: preselected, user can deselect it to not include it to the coming plan.
4. Toggle plan mode between NORMAL and EXTREME. Defaults to NORMAL.
5. User submits.
6. Create plan and link selected templates and Ad-hoc tasks (carried-over Ad-hoc tasks keep their status — only planId is re-pointed to the new plan).
7. For Ad-hoc tasks from PENDING_UPDATE plan that were not selected: set planId = null and status back to BACKLOG (return to the priority matrix). DONE Ad-hoc tasks stay linked so completed points keep their historical attribution.
8. Generate task instances **with `status = BACKLOG`** (staged in the backlog drawer): weekly tasks immediately, daily tasks for today only (respecting plan mode for weekend skipping).
9. Set `lastSyncDate = today`.
10. Archive any existing `PENDING_UPDATE` plan → `COMPLETED`.
11. Revalidate `/kanban` to render board.

---

## Update Plan Flow

### Trigger / Entry Point

User clicks "Edit Plan" on board header → navigates to `/kanban/plans/[id]`.

### Steps

1. Page preloads PlanTemplates (with type and frequency config) from the `ACTIVE` plan and all non-DONE Ad-hoc tasks associated with current plan from DB. 
2. For non-Ad-hoc task: user edits template selection and/or type and frequency for a choosen template.
3. For Ad-hoc task: user select/deselect to include/exclude task from current plan, deselect will set the planId to null and change the taskStatus to backlog => move back to priority matrix.
4. Toggle plan mode between NORMAL and EXTREME.
5. On submit, show confirmation modal summarizing the changes (added, removed, modified, mode change).
6. User clicks confirm and regenerate button.
7. Apply template changes and regenerate tasks accordingly (respecting plan mode for weekend skipping).
8. Revalidate `/kanban` to render updated board.

### Rules

- DONE and EXPIRED tasks are never touched regardless of change type.
- Changes are applied per-template, unaffected templates are fully preserved.
- Task regeneration logic
  - Added templates: generate new instances **as `BACKLOG`** (weekly immediately, daily for today only).
  - Removed templates: delete BACKLOG, TODO and DOING instances for that template.
  - Modified templates (type or frequency changed): delete BACKLOG, TODO and DOING instances for that template and regenerate (as `BACKLOG`) based on new config.

---

## AI Assisted Plan Creation Flow

### Trigger / Entry Point

User clicks the AI assistant button inside create plan page.

### Steps

1. **Open AI panel → resume or create Chat**
   - **Resume-or-create (persistence):** the chat is durable — the DB chat row is the source of truth. On open, if the in-memory store already holds a `chatId` (same session), just reveal the modal. Otherwise (fresh load / restart) call `getActiveAiChatAction`, which returns the user's most recent **unapproved** chat (`planId IS NULL`) via `getLatestInProgressChat`; rehydrate its messages + draft from the DB. Only when none exists do we create a new Chat. Approval sets `planId`, so the next fresh open starts a brand-new chat.
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

   - Persist full structured JSON as assistant Message content with `type = DRAFT_PLAN` (rendered in the chat + replayed to the LLM as history). Also overwrite `Chat.metadata.latestDraft` with `{ description, draftTemplates }` — the single-slot approval clipboard (commit-as-is), read directly off the already-loaded chat at approval time.
   - No streaming — show loading state, render full response at once.
   - UI renders the latest `DRAFT_PLAN` message expanded: plain text → read-only template cards → follow-up text. Prior `DRAFT_PLAN` messages render collapsed with expand toggle.

5. **Iterate or approve**
   - **Reject:** User provides text feedback → persist as user Message → redo step 4. The LLM sees prior drafts and the rejection through the full message history (no separate metadata read).
   - **Approve:** User clicks "Approve & Create Plan" → proceed to step 6.
   - V1: static wizard only. User cannot select/unselect or edit individual cards.

6. **Post-approval: create plan** (`approveDraftPlanAction({ chatId })` → `approveDraftPlan` service)
   - Read the draft from `Chat.metadata.latestDraft` (already loaded with the chat).
   - In **one transaction** (atomic), via `planService.createPlanFromDraft(tx, ...)`: batch-create the new templates (entries where `templateId` is null) with `createManyTaskTemplates`, resolve all entries to `{ templateId, type, frequency }[]`, then run the shared `createPlanInTx` core with the draft's `description` as `Plan.description` and `mode = NORMAL`. The core also completes the prior `PENDING_UPDATE` plan and links/moves ad-hoc tasks.
   - **Ad-hoc carry-over (V1):** the pending plan's non-done `AD_HOC` tasks are passed as `adhocTaskIds`, so they move to the new plan.

   **Error handling:** If the LLM returns an error or unusable output, show an error message in the chat bubble. No retry logic for V1.

### Chat Persistence & Resume

The conversation survives modal close/reopen, page reloads, and app restarts — until a plan is approved (which sets `Chat.planId`, ending the in-progress chat).

- **Source of truth = DB.** No client storage. On a fresh open the client calls `getActiveAiChatAction` and rebuilds `UiMessage[]` from the persisted rows (`reconstructMessages`): first assistant TEXT → welcome (chips recomputed from `lastPlanStats` presence), later TEXT → clarifying replies, `DRAFT_PLAN` → parsed draft cards. The approvable `latestDraft` is derived from the most recent `DRAFT_PLAN` message.
- **Same-session reopen** keeps the in-memory chat (no reload), so an in-flight generation finishes into the store and dismissing the modal mid-generation loses nothing.
- **Interrupted generation (app closed mid-run).** Each `generateDraftPlan` persists the user turn before calling the LLM. On rehydrate, if the last stored turn is an unanswered user message (`pendingGeneration`), the client auto-calls `resumeDraftPlanAction` → `resumeDraftPlan`, which regenerates from existing history **without** appending a new user turn (no duplicate). If the generation had actually completed server-side, the `DRAFT_PLAN` is already persisted and is shown instead.

### LLM Configuration

#### Prompt Strategy

All data is fetched server-side and injected into the LLM system prompt as context. No tool calling.

- **Stats from last plan:** Per-template performance (completed / expired / total, completion rate, points earned, type) fetched via `getTemplateStatsAction` (backed by the `getPlanTemplateStats` DAL query), rolled up to `overall` aggregates. Stored as a snapshot in `Chat.metadata.lastPlanStats` (`{ overall, perTemplate }`). `overall` drives the static welcome; `perTemplate` is the LLM's signal for which templates to keep, ease, or drop.
- **Existing task templates:** All non-archived templates for the user, so LLM can reuse existing ones (returning `templateId`) or suggest new ones (`templateId: null`).
- **Prior drafts:** Replayed as conversation history (each `DRAFT_PLAN` message's full JSON content), so the model sees its previous proposals and the user's rejection feedback in order — no separate "last draft" injection into the system prompt.

#### LLM Calls

- `generateDraftPlanAction`: Generates a draft plan. Input: user message + stats + templates + last draft. Output: structured JSON (`message`, `draftTemplates`, `followUp`). Called multiple times during iteration.
