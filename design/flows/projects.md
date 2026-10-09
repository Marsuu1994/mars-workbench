# Projects Flows

Flows for the Projects page (`/kanban/projects`; on mobile a project's detail is `/kanban/projects/[id]`). A project is a goal plus an ordered path of steps that never expire. Steps go onto the week one at a time and then move across the board like any other task. Sibling docs: `design/flows/board.md`, `design/flows/plan.md`, `design/flows/priorities.md`, `design/flows/shared.md`, `design/flows/auth.md`.

> **Status:** the data layer is built (PR 3: projects, steps, scheduling, carry-over); the Projects page and its modals are *designed — Phase 1 pending (PR 4)*, and the MCP flow PR 5. Screens: `design/mockup/future-work/mockup-projects-v2.html`, until the Projects scenario page replaces it.

> **Doc convention:** One flow per `##` heading, separated by `---`. Every flow has two required `###` sections — `Trigger / Entry Point` and `Steps` — plus an optional `### Rules` section for constraints and invariants. Extra `###` sections (e.g. `Metrics`) are allowed only for reference material that fits neither Steps nor Rules.

---

## Projects Landing Flow

### Trigger / Entry Point

User opens the **Projects** tab of the Plan hub → `/kanban/projects`.

### Steps

1. Await `ensureSynced` (see `design/flows/shared.md`).
2. List the user's non-archived projects, each with its progress (done / total steps), its next step and how many of its steps are on this week.
3. On desktop, select the first project and show its detail beside the list. On mobile, each project opens `/kanban/projects/[id]`.
4. A project's detail shows its path: done steps (in completion order, with their completion date), this week's steps (with their board status), then upcoming steps.

### Rules

- With no projects, the page shows its empty state, which offers creating a project.
- Archived projects are listed separately and can be unarchived.
- **All steps done:** a project with at least one step, every one DONE, shows as All steps done and offers adding the next steps or archiving. The state is derived from the steps: nothing is stored, and the project is never archived automatically. Adding a step makes it active again.
- Progress = DONE steps / all steps.

---

## Create Project Flow

### Trigger / Entry Point

"New project" on the Projects page, including its empty state.

### Steps

1. Open the **New Project** modal and enter the title (required) and goal (optional). On create, validate via Zod and persist the Project.
2. The new project is selected, with an empty path.

### Rules

- A project has no size; its size is the sum of its steps.

---

## Edit Project Flow

### Trigger / Entry Point

"Edit" on a project's detail.

### Steps

1. Open the **Edit Project** modal:
   - **Save:** validate and persist the title and goal.
   - **Archive:** after a confirm, archive the project.

### Rules

- Only the user archives a project, from this modal or from the All steps done state.
- On archive, the project's unfinished steps leave this week and return to the project (`planId = null`, `BACKLOG`); done steps keep their plan link.
- Unarchive restores the project with its path intact.
- Projects are never hard-deleted.

---

## Manage Steps Flow

### Trigger / Entry Point

Adding a step to a project, editing or deleting a step that isn't done, or reordering a project's steps.

### Steps

1. **Add:** open the **Add Step** modal and enter the title (required), description (optional) and size. Saving appends the step to the end of the path as a `PROJECT` task with `planId = null`, `BACKLOG` and `instanceIndex = n`.
2. **Edit:** open the **Edit Step** modal and change the same fields. Saving updates the step, including its board card when it is on this week.
3. **Delete:** from the Edit Step modal, after a confirm. The steps after it move up one.
4. **Reorder:** move a step to a new place in the path. The project's unfinished steps are renumbered in one transaction.

### Rules

- Done steps are locked: they can't be edited, deleted or reordered.
- `instanceIndex` is the 1-based step number and stays contiguous after any add, delete or reorder.
- Deleting a step that is on this week also takes it off the board.

---

## Schedule Step Flow

### Trigger / Entry Point

"+ This week" on an upcoming step, or Claude over MCP (`create_plan` / `update_plan`; see "Plan with Claude (MCP) Flow" in `design/flows/plan.md`).

### Steps

1. Requires a current-week `ACTIVE` plan; without one, scheduling is unavailable.
2. Set the step's `planId` to the active plan; `status` stays `BACKLOG`.
3. The step appears in the board's backlog and follows the existing board flows from there.
4. **Take back:** a step still in the backlog can be taken back from the Projects page (`planId = null`) and returns to its place in the path. A step already on the board leaves the week only through Edit Plan's deselect.

### Rules

- Any upcoming step can be scheduled, in any order.
- A step is on at most one plan at a time.

### Step Lifecycle

- **Unscheduled:** `planId = null` · `BACKLOG`.
- **Scheduled:** `planId = <active plan>` · `BACKLOG` (in the board's backlog).
- **On the board:** `TODO` → `DONE`.
- **Unfinished at the end of the week:** never expires. It stays on the `PENDING_UPDATE` plan until the next plan either carries it over (status kept) or returns it to its project (`planId = null` · `BACKLOG`, `instanceIndex` unchanged).
- **Done:** keeps its plan link.

---

## Draft Steps with Claude (MCP) Flow

### Trigger / Entry Point

The user asks Claude, connected to `/api/mcp`, to plan a project.

### Steps

1. Claude calls `get_planning_context`, which also returns the user's projects (progress, upcoming steps with ids and sizes), this week's scheduled steps with their status, and last week's step results.
2. Claude proposes the project and this week's steps; nothing is written before the user agrees.
3. Claude writes the project with `create_project` (a new project with its steps) or `update_project` (a patch: rename, goal, archive, add / edit / remove / reorder steps).
4. `update_plan` (active plan) or `create_plan` (new week) puts the agreed steps on the week via `projectStepIds`.

### Rules

- The tools never create one-offs.
- Claude archives a project only after the user agrees. For a project whose steps are all done, it asks whether to add the next steps or archive.
- Steps passed to `create_plan` / `update_plan` must be the user's, unfinished, and not already on this week's plan.
