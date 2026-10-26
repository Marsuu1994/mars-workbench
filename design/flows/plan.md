# Plan Flows

Flows for the plan pages (`/kanban/plans/new`, `/kanban/plans/[id]`) — task template management, plan create/update, and planning with Claude over MCP. Sibling docs: `design/flows/board.md`, `design/flows/priorities.md`, `design/flows/projects.md`, `design/flows/shared.md`, `design/flows/auth.md`.

---

## Create Task Template Flow

### Trigger / Entry Point

User clicks the "New Template" button on the plan form page.

### Steps

1. Open the template modal (a centered modal on desktop, a bottom sheet on mobile) with empty fields for title, description, and size.
2. The size selector displays all available sizes (XS–XL) with their corresponding point values and hour estimates. Selecting L or XL shows an inline warning suggesting the user consider splitting into smaller tasks.
3. User completes the form and clicks "Create". Validate input via Zod schema, then persist the new TaskTemplate.
4. The response re-renders the plan form with the new template; the modal closes once it has landed.

---

## Update Task Template Flow

### Trigger / Entry Point

User clicks the edit button on an existing template card within the plan form page.

### Steps

1. Open the template modal pre-populated with the current title, description, and size.
2. User modifies any fields. The size selector behaves identically to the create flow (point labels, L/XL warning).
3. User clicks "Save". Validate input, then persist changes to the existing TaskTemplate.
4. The response re-renders the plan form with the updated template; the modal closes once it has landed.

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
   2. For each selected template, user configures type and frequency (a −/+ stepper bounded to 1–10). Size (and derived points) come from TaskTemplate directly and are not configurable per-plan.
3. For non-DONE Ad-hoc tasks from the `PENDING_UPDATE` plan: preselected, user can deselect it to not include it to the coming plan.
4. Toggle plan mode between NORMAL and EXTREME. Defaults to NORMAL.
5. User submits.
6. Create plan and link selected templates and Ad-hoc tasks (carried-over Ad-hoc tasks keep their status — only planId is re-pointed to the new plan).
7. For Ad-hoc tasks from PENDING_UPDATE plan that were not selected: set planId = null and status back to BACKLOG (return to the priority matrix). DONE Ad-hoc tasks stay linked so completed points keep their historical attribution.
8. Generate task instances **with `status = BACKLOG`** (staged in the backlog): weekly tasks immediately, daily tasks for today only (respecting plan mode for weekend skipping).
9. Set `lastSyncDate = today`.
10. Archive any existing `PENDING_UPDATE` plan → `COMPLETED`.
11. Revalidate the board, matrix and Projects pages and redirect to the board, which comes back in the same response.

### Rules

- Every creation path (plan form, MCP) runs the same guard: sync first (a finished week's ACTIVE plan flips to `PENDING_UPDATE`), then refuse while an ACTIVE plan exists.
- **Project steps**:
  - The form loads the `PENDING_UPDATE` plan's unfinished steps, preselected; they can only be selected or deselected.
  - Selected steps are re-pointed to the new plan and keep their status.
  - Deselected steps return to their project: `planId = null`, `BACKLOG`, `instanceIndex` unchanged.
- Every referenced template must belong to the user; otherwise nothing is written and the form shows "Template not found".

---

## Update Plan Flow

### Trigger / Entry Point

User opens **Plan** from the sidebar or the mobile dock while this week has an active plan → `/kanban/plans/[id]`.

### Steps

1. Page preloads PlanTemplates (with type and frequency config) from the `ACTIVE` plan and all non-DONE Ad-hoc tasks associated with current plan from DB. 
2. For non-Ad-hoc task: user edits template selection and/or type and frequency for a choosen template.
3. For Ad-hoc task: user select/deselect to include/exclude task from current plan, deselect will set the planId to null and change the taskStatus to backlog => move back to priority matrix.
4. Toggle plan mode between NORMAL and EXTREME.
5. On submit, show the confirmation modal summarizing the changes (added, removed, modified, mode change) — a centered modal on desktop, a tall bottom sheet with a scrolling summary and pinned footer on mobile.
6. User clicks confirm and regenerate button.
7. Apply template changes and regenerate tasks accordingly (respecting plan mode for weekend skipping).
8. Revalidate the board, matrix and Projects pages and redirect to the board, which comes back in the same response.

### Rules

- DONE and EXPIRED tasks are never touched regardless of change type.
- Added templates must belong to the user; otherwise nothing is written.
- Changes are applied per-template, unaffected templates are fully preserved.
- Task regeneration logic
  - Added templates: generate new instances **as `BACKLOG`** (weekly immediately, daily for today only).
  - Removed templates: delete the template's unfinished (BACKLOG, TODO) instances.
  - Modified templates (type or frequency changed): delete the template's unfinished (BACKLOG, TODO) instances and regenerate (as `BACKLOG`) based on new config.
- **Project steps**:
  - The form loads this week's steps, which can only be deselected.
  - A deselected step returns to its project.
- Only what the user deselects leaves the week: the save carries the deselected one-offs and steps, so anything put on the week while the form was open (tracked from the matrix, scheduled from the Projects page, added by Claude) stays.

---

## Plan with Claude (MCP) Flow

### Trigger / Entry Point

The user asks Claude, connected to the `/api/mcp` server, to plan or adjust their week, a habit or a project. (Keeping one-offs on the matrix through the same tools: "Manage One-offs with Claude (MCP) Flow" in `design/flows/priorities.md`.)

### Steps

1. Claude reads the guide with `get_planning_guide_before_everything` (the server instructions, returned as a tool result because claude.ai doesn't pass them to the model).
2. Claude calls `get_planning_context`: sync first (`ensureSynced`), then today and the week; this week's ACTIVE plan (template lines with progress so far, its one-offs and project steps with their status) or last period's PENDING_UPDATE plan (per-template stats, its one-offs and project steps — done, and unfinished ones that carry over); the reusable templates; the projects with their whole paths (each step's state: `UPCOMING` / `THIS_WEEK` / `LAST_WEEK` / `DONE`); the archived projects; and the matrix's unfinished one-offs (each with its quadrant and state: `UNTRACKED` / `THIS_WEEK` / `LAST_WEEK`).
3. Claude recaps last week, asks what the user wants to keep or change, and proposes; nothing is written before the user agrees.
4. Projects and habits are settled first: `create_project` / `update_project` (see "Draft Steps with Claude (MCP) Flow" in `design/flows/projects.md`) and `update_habit` (a template's title, description, size).
5. No active plan → `create_plan`: existing templates by id plus brand-new ones, mode, description, `carryOverOneOffTaskIds` and `carryOverProjectStepIds` (each omitted = all of the last plan's unfinished one-offs / steps), `addOneOffTaskIds` (untracked one-offs) and `addProjectStepIds` (upcoming steps). Runs the shared creation guard, then one transaction — create the new templates, then the Create Plan Flow's steps 6–10 (links or returns one-offs and steps, generates BACKLOG instances, completes the pending plan), then tracks the added one-offs as the Track This Week Flow does.
6. Active plan → `update_plan` with a patch: add existing / create new / update type or frequency / remove templates, add or remove one-offs, add or remove project steps, mode, description. The patch is applied to the plan's current links, and the resulting full list runs through the Update Plan Flow's regeneration in one transaction with any new templates.
7. Each write returns what it changed and the plan, project or habit as it now stands, for Claude to report back.

### Rules

- `update_plan` only changes this week's ACTIVE plan; a plan id read before a week rollover is rejected.
- A patch that adds a template already in the plan, updates or removes one that isn't, or names an id twice is rejected whole; nothing is written.
- One-offs: carried-over or removed ones must be unfinished one-off tasks of that plan; an added one must be untracked (unfinished, on no plan) and is tracked exactly as the Track This Week Flow does — `planId` set, `BACKLOG → TODO`, into the user's to-do.
- Project steps: a carried-over step must be an unfinished step of the last plan; an added step must be upcoming (the user's, unfinished, on no plan, of a project that isn't archived); a removed step must be an unfinished step of this plan and returns to its project (`planId = null`, `BACKLOG`, step number unchanged).
- `update_habit` changes the template only: instances already generated keep their title and size.
- Identity: tool calls act for the user whose Supabase OAuth access token the request carries (see OAuth Consent Flow in `design/flows/auth.md`); local development without a token acts as `MCP_DEV_USER_ID`.
- Errors the model can act on (active plan exists, stale plan id, patch conflicts, unknown ids, invalid input) come back as `isError` results; unexpected errors are logged and reported generically.
