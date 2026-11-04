# MCP Flows

Flows for planning with Claude over the remote MCP server (`/api/mcp`, `src/mcp/`) — the week, habits, projects and one-offs, each written only once the user agrees. Connecting Claude and the token checks: `auth.md`. Where a flow here leans on a page's flow, it names the doc.

---

## Draft Projects with Claude (MCP) Flow

### Trigger / Entry Point

The user asks Claude, connected to `/api/mcp`, to start or change a project, or to plan a week that has projects in it.

### Steps

1. Claude reads the guide and calls `get_planning_context`, which returns every project with its whole path (each step's state and, once done, its day), the archived projects, and the steps on this and last week's plans with their status.
2. Claude follows the planning guide (`src/mcp/prompts/serverInstructions.ts`) — what it checks before proposing, and that nothing is written before the user agrees.
3. Claude writes the project with `create_project` (a new project with its whole path, every step upcoming) or `update_project` (a patch: title, goal, archive / unarchive, add / edit / move / remove steps; new and moved steps go right before a given step, or at the end).
4. Then `update_plan` (active plan) or `create_plan` (new week) puts the agreed steps on the week via `addProjectStepIds`.

### Rules

- Planning comes before scheduling: the project tools change projects only and never put steps on a week; the plan tools never create projects.
- A project holds 0 to 50 steps.
- An `update_project` patch is applied whole or not at all: done steps are locked, positions must be steps that stay, an archived project changes only when the same patch unarchives it, and the path stays within 50 steps. Unarchiving runs first and archiving last, so one patch can unarchive a project and change it.
- Removing a step deletes it and the steps after it move up; a step on this week leaves the board too.
- Archiving takes every unfinished step of the project off its week; unarchiving brings the project back, not its steps' places on the week.

---

## Manage One-offs with Claude (MCP) Flow

### Trigger / Entry Point

The user asks Claude, connected to the `/api/mcp` server, about their one-offs: what's on the matrix, to note a few tasks down, that some are done, to move one to another quadrant, or to put some on this week.

### Steps

1. Claude reads the guide and calls `get_planning_context`, whose `oneOffTasks` lists every unfinished one-off in matrix order with its quadrant, its state (`UNTRACKED` on no week, `THIS_WEEK`, `LAST_WEEK`) and the day it was created (see "Plan with Claude (MCP) Flow").
2. Claude follows the planning guide (`src/mcp/prompts/serverInstructions.ts`) — what it checks before proposing, and that nothing is written before the user agrees.
3. `create_one_off_tasks`: 1–20 tasks, each a title, size, quadrant and optional description, created exactly as the Add Priority Task Flow (`priorities.md`) creates one (`AD_HOC`, `BACKLOG`, `planId = null`) in one INSERT, listed on the matrix in the order given.
4. `update_one_off_tasks`, one transaction:
   - `completeTaskIds` completes tasks exactly as the Complete One-off Flow (`priorities.md`) does: a task on no week joins this week's ACTIVE plan when there is one (and stays on no week when there isn't); a task still on last week's plan keeps it, so its points count for last week.
   - `reprioritizeTasks` moves tasks between quadrants as the matrix's Reprioritize Flow does: only the quadrant changes, the task takes its place in the new quadrant's order by creation, and a tracked one-off stays on its week.
5. Putting one-offs on this week goes through the plan tools' `addOneOffTaskIds` — `create_plan` for a new plan, `update_plan` for the active one — which tracks them as the Track This Week Flow (`priorities.md`) does (see "Plan with Claude (MCP) Flow"); `update_plan`'s `removeOneOffTaskIds` sends a tracked one-off back to the matrix.
6. Each write returns the tasks as they now stand, for Claude to report back.

### Rules

- Only an untracked one-off (on no week) can be added to a week; one left on last week's plan moves by carry-over instead.
- Only unfinished one-offs of the user can be completed or moved; an unknown or done id, or one named twice (in either list, or in both), rejects the whole call, and nothing is written. The DAL's `WHERE` holds the same rule for the matrix page's writes.
- Completing is final, as on the matrix (whose Undo lives only in its toast): there is no reopen.

---

## Plan with Claude (MCP) Flow

### Trigger / Entry Point

The user asks Claude, connected to the `/api/mcp` server, to plan or adjust their week, a habit or a project. (Keeping one-offs on the matrix through the same tools: "Manage One-offs with Claude (MCP) Flow".)

### Steps

1. Claude reads the guide with `get_planning_guide_before_everything` (the server instructions, returned as a tool result because claude.ai doesn't pass them to the model).
2. Claude calls `get_planning_context`: sync first (`ensureSynced`), then today and the week; either this week's ACTIVE plan as `activePlan` (template lines with progress so far, its one-offs and project steps with their status) or, once a week has ended and before the next plan exists, the ended PENDING_UPDATE plan as `lastPlan` (per-template stats, its one-offs and project steps — done, and unfinished ones that carry over) — so last week can be recapped only when the new week is planned; the reusable templates; the projects with their whole paths (each step's state: `UPCOMING` / `THIS_WEEK` / `LAST_WEEK` / `DONE`); the archived projects; and the matrix's unfinished one-offs (each with its quadrant and state: `UNTRACKED` / `THIS_WEEK` / `LAST_WEEK`).
3. Claude follows the planning guide (`src/mcp/prompts/serverInstructions.ts`) — the recap, what it checks before proposing, and that nothing is written before the user agrees.
4. Projects and habits are settled first: `create_project` / `update_project` (see "Draft Projects with Claude (MCP) Flow") and `update_habit` (a template's title, description, size).
5. No active plan → `create_plan`: existing templates by id plus brand-new ones, mode, description, `carryOverOneOffTaskIds` and `carryOverProjectStepIds` (each omitted = all of the last plan's unfinished one-offs / steps), `addOneOffTaskIds` (untracked one-offs) and `addProjectStepIds` (upcoming steps). Runs the shared creation guard, then one transaction — create the new templates, then the Create Plan Flow's step 6 (`plan.md`) (generates BACKLOG instances, carries or returns one-offs and steps, completes the pending plan), then tracks the added one-offs as the Track This Week Flow does.
6. Active plan → `update_plan` with a patch: add existing / create new / update type or frequency / remove templates, add or remove one-offs, add or remove project steps, mode, description. The patch is applied to the plan's current links, and the resulting full list runs through the Update Plan Flow's regeneration (`plan.md`) in one transaction with any new templates.
7. Each write returns what it changed and the plan, project or habit as it now stands, for Claude to report back.

### Rules

- `create_plan` is refused while this week has an ACTIVE plan, and rejects an empty plan (no template, carried-over or added one-off or step) and a step both carried over and added; mode defaults to NORMAL. One ACTIVE plan per user isn't yet guaranteed against two creates at the same moment (`design/tracker.md` › Plan).
- `update_plan` only changes this week's ACTIVE plan; a plan id read before a week rollover is rejected. An empty `description` clears it.
- A patch that adds a template already in the plan, updates or removes one that isn't, or names an id twice is rejected whole; nothing is written.
- One-offs: carried-over or removed ones must be unfinished one-off tasks of that plan; an added one must be untracked (unfinished, on no plan) and is tracked exactly as the Track This Week Flow does — `planId` set, `BACKLOG → TODO`, into the user's to-do.
- Project steps: a carried-over step must be an unfinished step of the last plan; an added step must be upcoming (the user's, unfinished, on no plan, of a project that isn't archived); a removed step must be an unfinished step of this plan and returns to its project (`planId = null`, `BACKLOG`, step number unchanged).
- `update_habit` changes the template only: instances already generated keep their title and size.
- Identity: tool calls act for the user whose Supabase OAuth access token the request carries (see OAuth Consent Flow in `design/flows/auth.md`); local development without a token acts as `MCP_DEV_USER_ID`.
- Errors the model can act on (active plan exists, stale plan id, patch conflicts, unknown ids, invalid input) come back as `isError` results; unexpected errors are logged and reported generically.
