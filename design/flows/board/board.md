# Board (/kanban)

The week's working surface: habit instances, project steps and one-offs move from the backlog to Todo to Done.

Each screen lists its **rules** — what decides what the page shows, guarded by unit and integration tests — and the page lists the **actions** a user can take; the **journeys** string actions together, one e2e test each. How it looks is **Visual**, pinned by the Design Console's scenarios and accepted by the owner.

## States

Entering `/kanban` syncs first (`flows/shared.md`); a plan whose week has ended moves from `ACTIVE` to `PENDING_UPDATE` there. The page is then in one of three states:

- **New user** — no `ACTIVE` plan, none waiting to close: the empty board asks for a first plan.
- **Returning user** — no `ACTIVE` plan, a `PENDING_UPDATE` one: the empty board shows last week's recap.
- **Active plan** — an `ACTIVE` plan for this week: the board. One read returns the plan (its week, its mode, its habit templates and their frequencies), its tasks (every one but `EXPIRED`), the projects behind its steps (each with its whole path) and the progress counts; nothing is read again until a write lands.

## Empty board

### Rules

The recap counts all of last week's tasks — habit instances, project steps and one-offs:

- **completion rate** — the done ones ÷ all of them, expired included
- **tasks done** — done / all
- **points earned** — the done ones' points

Tested in `boardService.int.test.ts` › getEmptyBoardState. **Bug:** the recap counts habit instances only — a failing test (`it.fails`) to add.

## Board

### Columns

- Todo holds the `TODO` tasks, Done the `DONE` ones; `BACKLOG` tasks wait in the backlog, `EXPIRED` ones aren't shown. Each header counts its cards.
- **Todo** runs by kind: one-offs, then daily habits, then weekly habits, then project steps. Within a kind a group — one habit's instances, one project's steps — stays together: groups rank by their earliest `createdAt` and run in instance order (copy number, step number); a one-off ranks by its own `createdAt`. Ties go to `createdAt`, then id.
- **Done** runs by when each task was done, the latest first.

Tested in `taskUtils.test.ts` › sortTasks, sortDoneTasks; `boardCardUtils.test.ts` › toBoardCards.

### Task cards

- **A habit's dots** — one per instance its plan line has this week, in order: a daily line has N on each day it runs (weekdays in `NORMAL`, every day in `EXTREME`), a weekly line N. A dot is filled when that instance is done, empty when not, and ringed on the card's own instance.
- **A step's path** — one segment per step of its project, in step order: filled when done, empty when not, ringed on the card's own step.
- A card's dot or segment fills the moment it lands on Done, before the server answers.

Tested in `taskUtils.test.ts` › computeHabitWeeks; `boardCardUtils.test.ts` › toBoardCards.

### Backlog

> **Designed, not built yet** — mockup `design/mockup/mockup-board-backlog-grouping.html` (PR #109, amended in #114). Today the backlog is a flat list of board cards; the grouping rules below are planned.

- Holds the plan's `BACKLOG` tasks: habit instances and the project steps scheduled this week. Never one-offs.
- **The count** is every staged task, not every group. Past 8 it reads `8+`; its accessible name keeps the real number.
- **Groups** — a habit's staged instances are one group, a project's staged steps another. Habits come first, daily then weekly, then projects; within each, by earliest `createdAt`.
- **The next** — a group shows one card, its next task: a habit's earliest instance, a project's lowest step. Its ringed dot or segment is the next's.
- **+N more** counts the tasks behind the next; nothing when the next is the last.

### Progress

> **As is.** Phase 2 redesigns the dashboard; this section is kept as it stands.

The server counts; the client turns the counts into percentages and the daily average.

| Metric | Done | Out of |
| --- | --- | --- |
| Today | tasks done today | tasks on the board: not `BACKLOG` |
| Today points | their points | the board's points |
| Week | tasks done on the plan | projected: daily tasks before today (done or not) + the daily templates × days left + weekly instances + one-offs + steps, backlog included |
| Week points | their points | the same projection in points |
| Daily avg | the week's done points ÷ days since Monday (1–7), one decimal | — |

- Days left: `NORMAL` counts the weekdays from today to Sunday, `EXTREME` every day left (at least 1).
- A percentage is done ÷ out of, rounded; 0 when there is nothing to do.
- Today's daily tasks count once, in the projection, never also as "before today".

Tested in `boardService.int.test.ts` › fetchBoard (the percentages and the daily average have no test).

## Actions

| Action | How | What happens |
| --- | --- | --- |
| Start a plan | the empty board's button | opens the plan page |
| Open / close the backlog | the strip (desktop), the pill (mobile) | opens the panel or the sheet; it is closed whenever the page loads. Only its visible side takes focus: opening moves focus into it, closing back to the entry |
| Expand a project *(planned)* | a project group's **+N more ⌄** | its queue — the steps behind the next, in step order, read-only — replaces the pile; again to fold it. A habit's +N more doesn't open |
| Pull to Todo | drag a backlog card onto Todo (desktop), ↑ Todo (mobile) | a move, Backlog → Todo; the mobile sheet stays open for the next |
| Finish from the backlog | drag a backlog card onto Done (desktop only, by design) | a move, Backlog → Done |
| Finish | drag a Todo card onto Done | a move, Todo → Done |

### A move

1. **At once** the card is in its new place — on top of Done, or in Todo by its kind — and the backlog's count drops.
2. **The server** saves it: a move to Done stamps when it was done, a move to Todo clears it.
3. **Once it lands** the page's data reloads and progress counts it — never before. A one-off moved to Done leaves the priority matrix too.
4. **If it fails**, only that card goes back; other moves in flight stay.

### Rules

- **Forward only** — Backlog → Todo, Backlog → Done, Todo → Done; the server refuses anything else, so what was done stays counted. The board doesn't offer it either: a Done card has no drag handle, and the backlog takes no drops.
- **Only a task on the plan, and only the user's own**, moves; a one-off still on the matrix reaches the board through Track This Week.
- *(planned)* **A pull always takes the group's next task.** Once it lands the group shows the one behind it: the pile loses a sheet, +N more counts one fewer, an open queue moves up; pulling the last one removes the group.
- *(planned)* **Lifting a group's card shows the next one behind it** in the backlog while the drag lasts.

Tested in `tasks.int.test.ts` › updateTaskStatus.

## Journeys (e2e)

- **Entry** — each state shows its screen; Start a plan opens the plan page.
- **A week's work** (desktop) — open the backlog and look over it; expand a project; pull its card to Todo — while it is lifted the next step shows behind it *(planned)*, and once it lands the group moves up; finish a habit straight from the backlog — its dot fills; finish the step from Todo — its segment fills; reload — every move stayed, and today's progress counts them; a Done card is not a drag handle; close the backlog.
- **Mobile pull** — open the sheet; ↑ Todo twice, the sheet stays open; close it; reload — both in Todo.

## Visual

- **Card layout**, top to bottom and left to right: kind (icon and name; a step shows its project's name) · properties, top right (a habit's plan line Daily × N / Weekly × N, a step's Step n/N, a one-off's quadrant) · title · description · progress, bottom left (dots or path; a one-off has none) · size and points (removed in Phase 2).
- **A Done card** is the same card, settled: dimmed, its title struck through, its description hidden.
- **Backlog entry** — desktop: a collapsed strip on the board's right edge opening a panel; mobile: a pill above the tab bar opening a bottom sheet over it, the board peeking behind the scrim. Mobile rows are full width, with ↑ Todo bottom right.
- **Empty backlog** — desktop: the strip shows 0 and the panel an empty state; mobile: the pill is hidden.
- *(planned)* **A group card** is the board's card with +N more in the properties' place and no size, on a pile: one thin sheet per task behind the next, at most three.
