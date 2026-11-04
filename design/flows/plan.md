# Plan Flows

Flows for the plan pages (`/kanban/plans/new`, `/kanban/plans/[id]`) — task template management and plan create/update. Planning with Claude over MCP: `mcp.md`.

---

## Create Task Template Flow

### Trigger / Entry Point

User clicks "+ New Template" on the plan form (create or update page).

### Steps

1. Open the "Create Task Template" modal (a centered modal on desktop, a bottom sheet on mobile): title and description empty, size M.
2. The size selector shows XS–XL, each with its points; the chosen size's hours show once below them. Choosing L or XL adds a hint to split it into smaller tasks.
3. User fills in title and description (both required; the description is read by Claude when planning) and clicks "Create Template". Validate input via Zod schema, then persist the new TaskTemplate.
4. The response re-renders the plan form with the new template at the top of the list, not selected; the modal closes once it has landed.

---

## Update Task Template Flow

### Trigger / Entry Point

User clicks the pencil on a template card in the plan form (always shown on mobile, on hover or keyboard focus on desktop).

### Steps

1. Open the "Edit Task Template" modal pre-populated with the current title, description, and size.
2. User modifies any fields. The size selector behaves as in the create flow (points per size, the chosen size's hours, the L/XL hint); title and description stay required.
3. User clicks "Save Changes". Validate input, then persist changes to the existing TaskTemplate.
4. The response re-renders the plan form with the updated template; the modal closes once it has landed.

### Rules

- Editing a template does not retroactively change already-generated Task instances. Only future task generation uses the updated values.
- A template that isn't the user's is not found: nothing is written and the form shows "Template not found".
- Claude edits the same fields with `update_habit` (`mcp.md`), under the same rules.

---

## Create Plan Flow

### Trigger / Entry Point

No active plan this week, and the user clicks "Create Your First Plan" / "Create New Plan" on the empty board, Plan in the sidebar or dock, the Projects page's Create plan banner, or the matrix's no-plan hint → `/kanban/plans/new`.

### Steps

1. Sync first, then load the user's templates and, when last week's plan is `PENDING_UPDATE` (a returning user), its template lines, mode, and unfinished one-offs and project steps.
2. Templates: last week's lines start selected with their type and frequency. Selecting a template adds it as DAILY × 1; type is DAILY or WEEKLY, frequency a −/+ stepper from 1 to 10; deselecting and reselecting brings back the last setting. Size and points come from the template. New templates: "Create Task Template Flow".
3. Last week's unfinished one-offs and steps start selected; the user can only deselect them.
4. Mode: NORMAL or EXTREME, starting from last week's mode (NORMAL for a first plan). Description is optional.
5. User clicks "Start Week" (disabled until something is selected).
6. One transaction:
   1. Create the plan, link the templates and generate their instances as `BACKLOG`: WEEKLY × frequency for the week, DAILY × frequency for today only (none on a NORMAL weekend).
   2. Carry the selected one-offs and steps onto the new plan, status kept.
   3. Return the rest of last week's unfinished ones: one-offs to the matrix, steps to their project at the same step number (`planId = null`, `BACKLOG`). Done ones stay on last week.
   4. Last week's plan → `COMPLETED`; `lastSyncDate = today`.
7. Revalidate the board, matrix and Projects pages and redirect to the board, which comes back in the same response.

### Rules

- Every creation path (plan form, MCP) syncs first, then refuses while this week has an ACTIVE plan.
- The form only carries over: it can't put an untracked one-off or an upcoming step on the week. Those go on once the plan exists — a one-off from the matrix ("Track This Week Flow", `priorities.md`), a step from the Projects page ("Schedule Step Flow", `projects.md`) — or through Claude's `create_plan` (`mcp.md`).
- Only last week's unfinished one-offs carry over, and only its unfinished steps or upcoming ones (on no week, project not archived); any other id submitted is left where it is. A one-off completed on the matrix after the form loaded stays on last week.
- A plan needs at least one template, one-off or step; every template must be the user's, or nothing is written and the form shows "Template not found".

---

## Update Plan Flow

### Trigger / Entry Point

User opens **Plan** from the sidebar or the mobile dock while this week has an active plan → `/kanban/plans/[id]`. Any other plan's URL (an old link, or a plan whose week has ended) redirects to the board.

### Steps

1. Sync first, then load the "Update Weekly Plan" form from the `ACTIVE` plan: its template lines with their type and frequency, its description and mode, its unfinished one-offs and this week's unfinished project steps, all selected.
2. Templates: select, deselect, or change a selected one's type and frequency, as in the Create Plan Flow. New templates: "Create Task Template Flow".
3. One-offs and steps can only be deselected: a deselected one-off returns to the matrix, a deselected step to its project at the same step number (`planId = null`, `BACKLOG`).
4. Toggle plan mode between NORMAL and EXTREME; edit or clear the description.
5. User clicks "Update Plan". With no template, one-off, step or mode change (a description edit alone included), it saves straight away; otherwise the "Review Plan Changes" modal summarizes what changes — added, removed and modified templates (with how many unfinished instances each loses), one-offs back to the matrix, steps back to their project, the mode change — a centered modal on desktop, a tall bottom sheet with a scrolling summary and pinned footer on mobile.
6. User clicks "Confirm & Regenerate".
7. One transaction: apply the template changes and regenerate (Rules), return the deselected one-offs and steps, save mode and description.
8. Revalidate the board, matrix and Projects pages and redirect to the board, which comes back in the same response.

### Rules

- Only this week's `ACTIVE` plan changes. A save after the week has ended (the form left open across it) writes nothing and shows "This plan's week has ended…"; MCP's `update_plan` holds the same rule.
- DONE and EXPIRED tasks are never touched regardless of change type.
- Added templates must belong to the user; otherwise nothing is written and the form shows "Template not found".
- Changes are applied per-template, unaffected templates are fully preserved.
- Task regeneration logic
  - Added templates: generate new instances **as `BACKLOG`** (weekly × frequency for the week, daily for today only, none on a NORMAL weekend).
  - Removed templates: delete the template's unfinished (BACKLOG, TODO) instances, on the board's to-do too.
  - Modified templates (type or frequency changed): delete the template's unfinished instances and regenerate them as `BACKLOG` from the new config.
  - Regenerated instances follow the new mode; template changes set `lastSyncDate = today`.
- A mode change alone regenerates nothing: it applies from the next daily sync.
- Only what the user deselects leaves the week: the save carries the deselected one-offs and steps, so anything put on the week while the form was open (tracked from the matrix, scheduled from the Projects page, added by Claude) stays. Templates are the exception: the form still saves its full list, so a habit Claude adds or changes meanwhile is undone (`design/tracker.md` › Plan).
