# Projects Flows

Flows for the Projects page (`/kanban/projects`; the selected project is the URL's `?project=`). A project is a goal plus an ordered path of steps that never expire. Steps go onto the week one at a time and then move across the board like any other task. Sibling docs: `design/flows/board.md`, `design/flows/plan.md`, `design/flows/priorities.md`, `design/flows/shared.md`, `design/flows/auth.md`.

> **Status:** built — the data layer (PR 3), steps on the board and in the plan form (PR 4a), the Projects page and its modals (PR 4c; states in `/design/scenarios/projects`), and Claude over MCP (PR 5).

---

## Projects Landing Flow

### Trigger / Entry Point

User opens **Projects** from the sidebar or the mobile dock → `/kanban/projects`.

### Steps

1. Await `ensureSynced` (see `design/flows/shared.md`).
2. List the user's non-archived projects, each with its progress (done / total steps), its next step and how many of its steps are on this week.
3. On desktop, select the project `?project=` names (else the first) and show its detail beside the list. On mobile, show the list; choosing a project shows its detail instead, and back returns to the list. Selecting never waits on the server, and a reload keeps the selection.
4. A project's detail shows its path: done steps first (in completion order, with their completion date), then the unfinished steps in path order. A step on a week is marked where it stands: this week's with its board status, last week's while it waits for the next plan.

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

1. **Add:** open the **Add Step** modal and enter the title (required), description (optional) and size. Saving appends the step to the end of the path as a `PROJECT` task with `planId = null`, `BACKLOG` and `instanceIndex = n`; a path that already holds 50 steps refuses it.
2. **Edit:** open the **Edit Step** modal and change the same fields. Saving updates the step, including its board card when it is on this week.
3. **Delete:** from the Edit Step modal, after a confirm. The steps after it move up one.
4. **Reorder:** drag a step right before another one, or to the end of the path. The whole path is renumbered in one transaction — the same rule Claude's `update_project` uses.

### Rules

- Done steps are locked: they can't be edited, deleted or reordered.
- `instanceIndex` is the 1-based step number and stays contiguous after any add, delete or reorder; a done step's number can change when a step moves across it, its place in the path never does.
- A project holds at most 50 steps.
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

The user asks Claude, connected to `/api/mcp`, to start or change a project, or to plan a week that has projects in it.

### Steps

1. Claude reads the guide and calls `get_planning_context`, which returns every project with its whole path (each step's state and, once done, its day), the archived projects, and the steps on this and last week's plans with their status.
2. Claude confirms what the user wants — a project (a goal with an end) or a habit — and whether it extends an existing project or habit, then proposes the project and this week's steps; nothing is written before the user agrees.
3. Claude writes the project with `create_project` (a new project with its whole path) or `update_project` (a patch: title, goal, archive / unarchive, add / edit / move / remove steps; new and moved steps go right before a given step, or at the end).
4. Then `update_plan` (active plan) or `create_plan` (new week) puts the agreed steps on the week via `addProjectStepIds`.

### Rules

- Planning comes before scheduling: the project tools never put steps on a week, the plan tools never create projects.
- The tools never create one-offs.
- Claude archives a project only after the user agrees. For a project whose steps are all done, it asks whether to add the next steps or archive.
- Claude keeps a project to about 10 steps, proposing a first milestone when the goal is bigger, and keeps the steps' order unless the user asks.
- An `update_project` patch is applied whole or not at all: done steps are locked, positions must be steps that stay, an archived project changes only when the same patch unarchives it, and the path stays within 50 steps.
