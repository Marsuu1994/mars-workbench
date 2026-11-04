# Projects Flows

Flows for the Projects page (`/kanban/projects`; the selected project is the URL's `?project=`). A project is a goal plus an ordered path of steps that never expire. Steps go onto the week one at a time and then move across the board like any other task.

---

## Projects Landing Flow

### Trigger / Entry Point

User opens **Projects** from the sidebar or the mobile dock → `/kanban/projects`.

### Steps

1. Await `ensureSynced` (see `design/flows/shared.md`).
2. List the user's non-archived projects, newest first, each with its progress (done / total steps), its next step (the first unfinished one in path order) and how many of its unfinished steps are on this week.
3. On desktop, select the project `?project=` names (else the newest) and show its detail beside the list; an archived project's detail never opens, so naming one falls back the same way. On mobile, show the list; choosing a project shows its detail instead, and back returns to the list. Selecting never waits on the server, and a reload keeps the selection.
4. A project's detail shows its path: done steps first (in completion order, with their completion date), then the unfinished steps in path order. A step on a week is marked where it stands: this week's with its board status, last week's while it waits for the next plan.

### Rules

- With no projects, the page shows its empty state, which offers creating a project. With every project archived, the detail shows its own empty state, which offers the same.
- With no current-week plan, the detail warns and links to plan creation, and every "+ This week" is disabled.
- Archived projects are listed separately, under an Archived header with their count that opens and closes them; it starts collapsed on every visit, or open when no project is active. Each one can be unarchived.
- **All steps done:** a project with at least one step, every one DONE, shows as All steps done and offers adding the next steps or archiving. The state is derived from the steps: nothing is stored, and the project is never archived automatically. Adding a step makes it active again.
- Progress = DONE steps / all steps.
- A modal's save (new / edit project, add / edit / delete step) and the Archive and Unarchive buttons finish only once the page's refreshed data has landed: the modal closes, or the button stops loading, onto the updated list.

---

## Create Project Flow

### Trigger / Entry Point

"New project" on the Projects page, including its empty state.

### Steps

1. Open the **New Project** modal and enter the title (required) and goal (optional). On create, validate via Zod and persist the Project.
2. Once the refreshed list has landed, the modal closes and the new project is selected, with an empty path.

### Rules

- A project has no size or points of its own: its steps carry them.

---

## Edit Project Flow

### Trigger / Entry Point

"Edit" on a project's detail.

### Steps

1. Open the **Edit Project** modal:
   - **Save:** validate and persist the title and goal.
   - **Archive:** after a confirm, archive the project. Archiving clears `?project=`, so the newest active project takes over (mobile: back to the list).

### Rules

- Only the user archives a project: from this modal (after a confirm), from the All steps done state (one click), or by agreeing to Claude's `update_project` (`mcp.md`).
- On archive, the project's unfinished steps leave whatever plan they are on — this week's, off the board too, or last week's pending one — and return to the project (`planId = null`, `BACKLOG`); done steps keep their plan link.
- An archived project takes no changes — title, goal, steps, their order — until it is unarchived; the server refuses them on every path.
- Unarchive restores the project with its path intact and selects it (mobile: its detail).
- Projects are never hard-deleted.

---

## Manage Steps Flow

### Trigger / Entry Point

Adding a step to a project, editing or deleting a step that isn't done, or reordering a project's steps.

### Steps

1. **Add:** open the **Add Step** modal and enter the title (required), description (optional) and size. Saving appends the step to the end of the path as a `PROJECT` task with `planId = null`, `BACKLOG` and `instanceIndex = n`; a path that already holds 50 steps refuses it.
2. **Edit:** open the **Edit Step** modal and change the same fields. Saving updates the step, including its board card when it is on this week.
3. **Delete:** from the Edit Step modal, after a confirm. The steps after it move up one.
4. **Reorder:** drag a step right before another one, or to the end of the path. The whole path is renumbered in one transaction — the same rule Claude's `update_project` uses.

### Rules

- Done steps are locked: they can't be edited, deleted or reordered, nor be the step another one moves before.
- `instanceIndex` is the 1-based step number and stays contiguous after any add, delete or reorder; a done step's number can change when a step moves across it, its place in the path never does.
- A project holds at most 50 steps.
- Deleting a step that is on this week also takes it off the board.

---

## Schedule Step Flow

### Trigger / Entry Point

"+ This week" on an upcoming step, or Claude over MCP (`create_plan` / `update_plan`; see "Plan with Claude (MCP) Flow" in `design/flows/mcp.md`).

### Steps

1. Requires a current-week `ACTIVE` plan; without one, every "+ This week" is disabled.
2. Set the step's `planId` to the active plan; `status` stays `BACKLOG`.
3. The step appears in the board's backlog and follows the existing board flows from there.
4. **Take back:** a step still in this week's backlog can be taken back from the Projects page (`planId = null`) and returns to its place in the path; last week's waits for the next plan. A step already on the board leaves the week when the plan deselects it (Edit Plan, or Claude's `update_plan`), when its project is archived, or when it is deleted.

### Rules

- Any upcoming step can be scheduled, in any order.
- A step is on at most one plan at a time.

### Step Lifecycle

- **Unscheduled:** `planId = null` · `BACKLOG`.
- **Scheduled:** `planId = <active plan>` · `BACKLOG` (in the board's backlog).
- **On the board:** `TODO` → `DONE`.
- **Unfinished at the end of the week:** never expires. It stays on the `PENDING_UPDATE` plan until the next plan either carries it over (status kept) or returns it to its project (`planId = null` · `BACKLOG`, `instanceIndex` unchanged).
- **Done:** keeps its plan link.
