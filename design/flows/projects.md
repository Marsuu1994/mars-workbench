# Projects Flows

Flows for the Projects page (`/kanban/projects`; on mobile a project's detail is `/kanban/projects/[id]`). A project is a goal plus an ordered path of steps that never expire. Steps go onto the week one at a time and then move across the board like any other task. Sibling docs: `design/flows/board.md`, `design/flows/plan.md`, `design/flows/priorities.md`, `design/flows/shared.md`, `design/flows/auth.md`.

> **Status:** *designed — Phase 1 pending.* The design was approved in `design/spike/week-model-restructure.md`. The screens are in `design/mockup/future-work/mockup-projects-v2.html` until PR 4's scenario page takes over. Delivery is split three ways: PR 3 brings the data layer, PR 4 the page and its modals, and PR 5 the MCP tools.

> **Doc convention:** One flow per `##` heading, separated by `---`. Every flow has two required `###` sections — `Trigger / Entry Point` and `Steps` — plus an optional `### Rules` section for constraints and invariants. Extra `###` sections (e.g. `Metrics`) are allowed only for reference material that fits neither Steps nor Rules.

---

## Projects Landing Flow

### Trigger / Entry Point

User opens the **Projects** tab of the Plan hub (This week · Projects) → `/kanban/projects`. There is no new nav item: the sidebar's Plan item and the dock's Plan tab stay active on every Projects route.

### Steps

1. Await `ensureSynced` (see `design/flows/shared.md`).
2. List the user's non-archived projects. Each card shows its progress (done / total steps), its next step and how many of its steps are on this week.
3. Selecting a project shows its path in this order: done steps with their completion date, this week's steps with their board status, then upcoming steps with their size. Desktop shows list and detail side by side; on mobile each list row opens `/kanban/projects/[id]`.

### Rules

- **Empty state:** with no projects at all, the page offers one action, "New project", plus a pointer to drafting a whole project with Claude.
- **Archived** projects sit at the bottom of the list, each with **Unarchive**.
- **All steps done:** this state applies when a project has at least one step and every step is DONE.
  - The card's "Next:" becomes an "All steps done" badge.
  - The detail shows a banner offering to add the next steps or to **Archive**, with the same two-step confirm as Edit Project.
  - The state is derived from the steps: nothing is stored and nothing is archived automatically. Adding a step makes the project active again.
- Progress = DONE steps / all steps.

---

## Create Project Flow

### Trigger / Entry Point

"+ New project" in the Projects page header, or the same button in the empty state.

### Steps

1. Open the **New Project** modal — the TaskModal shell (header with ×, a project banner, **Title** required, **Goal** optional, Cancel / Create project). It is a centered modal on desktop and a bottom sheet on mobile.
2. User enters the title (and optionally the goal) and clicks "Create project". Validate via Zod, then persist the Project.
3. The new project is selected, and its empty detail prompts "+ Add the first step".

### Rules

- "Create project" is disabled until Title has text.
- A project has no size; its size is the sum of its steps.

---

## Edit Project Flow

### Trigger / Entry Point

"Edit" at the top right of a project's detail.

### Steps

1. Open the **Edit Project** modal (New Project without the banner) with the title and goal filled in. **Archive** sits on the left of the footer.
2. **Save:** validate and persist the title and goal.
3. **Archive:** a two-step confirm on the sign-out pattern. "Archive" turns into "Archive?" with "Unfinished steps leave this week" underneath; confirming archives the project.

### Rules

- Archiving is always the user's call, from this modal or the All steps done banner. Nothing archives a project automatically, and over MCP Claude archives only after the user agrees.
- On archive:
  - The project's unfinished steps leave this week and return to the project (`planId = null`, `BACKLOG`).
  - Done steps keep their plan link, which preserves points history.
  - The project moves to Archived, and the list selects the next project.
- Unarchive restores the project with its path intact.
- Projects are never hard-deleted.

---

## Manage Steps Flow

### Trigger / Entry Point

- **Add:** "+ Add step" under a project's path.
- **Edit / delete:** the ✎ on any step that isn't done.
- **Reorder:** the drag handle on an upcoming or this-week step on desktop; a long press on the row on mobile.

### Steps

1. **Add:** open the **Add Step** modal. It has the Create Task Template fields: Title (required), Description (optional), and the Size pills with the effort hint and the L / XL "consider splitting" warning. The header names the project and "becomes step n".
   - Saving appends the step to the end of the path as a `PROJECT` task with `planId = null`, `BACKLOG` and `instanceIndex = n`, then closes the modal.
2. **Edit:** the ✎ opens the **Edit Step** modal with the same fields filled in and **Delete step** on the left of the footer. Saving updates the step; if the step is on this week, its board card updates too.
3. **Delete:** a two-step confirm, "Delete step" → "Delete step?". The steps after it move up one.
4. **Reorder:** drop the step in its new place. The project's unfinished steps are renumbered in one transaction.

### Rules

- One step per Add, like Add Priority Task. Drafting many steps at once is Claude's job (see "Draft Steps with Claude (MCP) Flow").
- The ✎ is always visible, never hover-only, because a hover control can't be found on touch.
- Done steps are locked: no edit, delete or reorder. They carry points history and stay at the top in completion order.
- `instanceIndex` is the 1-based step number and stays contiguous after any add, delete or reorder.
- Deleting a step that is on this week also takes it off the board.

---

## Schedule Step Flow

### Trigger / Entry Point

- "+ This week" on an upcoming step on the Projects page ("+ Week" on mobile).
- Claude over MCP (`create_plan` / `update_plan`; see "Plan with Claude (MCP) Flow" in `design/flows/plan.md`).

### Steps

1. Requires a current-week `ACTIVE` plan. Without one, the button is disabled and the page shows the same no-plan notice as the priority matrix, with a Create Plan link.
2. Set the step's `planId` to the active plan; `status` stays `BACKLOG`.
3. The step appears in the board's backlog and follows the existing board flows from there: pull to Todo, drag to Done.
4. **Take back:** a step still in the backlog shows × on the Projects page. Clicking it sets `planId = null`, and the step returns to its place in the path. A step already on the board leaves the week only through Edit Plan's deselect.

### Rules

- Any upcoming step can be scheduled; no order is enforced.
- A step is on at most one plan at a time.

### Step Lifecycle

- **Unscheduled:** `planId = null` · `BACKLOG`.
- **Scheduled:** `planId = <active plan>` · `BACKLOG` (in the board's backlog).
- **On the board:** `TODO` → `DONE` (Phase 1 removes the Doing column).
- **Unfinished at the end of the week:** never expires. It stays on the `PENDING_UPDATE` plan until the next plan either carries it over (status kept) or returns it to its project (`planId = null` · `BACKLOG`, `instanceIndex` unchanged).
- **Done:** keeps its plan link and shows its completion date in the path.

---

## Draft Steps with Claude (MCP) Flow

### Trigger / Entry Point

The user asks Claude, connected to `/api/mcp`, to plan a project (e.g. "three days of a biomedical course this week").

### Steps

1. Claude calls `get_planning_context`, which now also returns:
   - the user's projects: progress and upcoming steps with ids and sizes;
   - this week's scheduled steps with their status;
   - last week's step results.
2. Claude proposes the project and this week's steps in conversation; nothing is written before the user agrees.
3. Claude writes the project:
   - `create_project` for a new project with its steps;
   - `update_project` for a patch to an existing one: rename, goal, archive, or add / edit / remove / reorder steps.
4. `update_plan` (active plan) or `create_plan` (new week) puts the agreed steps on the week via `projectStepIds`.
5. The project shows up on the Projects page, and its scheduled steps appear in the board's backlog.

### Rules

- The same propose → agree → write rule as the other MCP tools applies, and the tools still never create one-offs.
- Claude never archives on its own; it archives only after the user agrees. For a project whose steps are all done, it asks whether to add the next steps or archive. The prompt wording is finalized in PR 5.
- Steps passed to `create_plan` / `update_plan` must be the user's, unfinished, and not already on this week's plan.
