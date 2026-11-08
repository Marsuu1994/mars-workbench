# Board · Read

What the board page (`/kanban`) reads, and what each part of the page derives from it.

## Source

Entering `/kanban` syncs first (`flows/shared.md`); a plan whose week has ended moves from `ACTIVE` to `PENDING_UPDATE` there. The page is then in one of three states, by the plans the user has.

### New user — no plan

No `ACTIVE` plan and none waiting to close. Nothing more is read: the empty board asks for a first plan.

### Returning user — last week's plan waiting to close

No `ACTIVE` plan, but a `PENDING_UPDATE` one. One more read: last week's recap, over all that plan's tasks — habit instances, project steps and one-offs.

- **completion rate** — the done ones ÷ all of them, expired included
- **tasks done** — done / all
- **points earned** — the done ones' points

Tested in `boardService.int.test.ts` › getEmptyBoardState. Bug: the recap counts habit instances only, leaving out the week's steps and one-offs — a failing test (`it.fails`) to add.

### Active plan — this week

An `ACTIVE` plan for this week. One read returns four things, and everything below derives from them; nothing is read again until a write lands and the page's data reloads.

- **plan** — its week, its mode (`NORMAL` / `EXTREME`), its habit templates and their frequencies
- **tasks** — every task on the plan but `EXPIRED`: habit instances, the project steps scheduled this week, the one-offs tracked onto it
- **projects** — the projects behind those steps, each with its whole path
- **progress** — the counts and point sums below, computed on the server

## Progress

> **As is.** Phase 2 redesigns the dashboard, so this section is kept as it stands and not migrated; it stays on the ratchet's list until then.

The server counts; the client turns the counts into percentages and the daily average.

| Metric | Done | Out of | Test |
| --- | --- | --- | --- |
| Today | tasks done today | tasks on the board: not `BACKLOG` | `boardService.int` › counts today's and the week's progress; › doesn't count yesterday evening's work as today's |
| Today points | their points | the board's points | same |
| Week | tasks done on the plan | projected: daily tasks before today (done or not) + the daily templates × days left + weekly instances + one-offs + steps, backlog included | › counts today's and the week's progress |
| Week points | their points | the same projection in points | same |
| Daily avg | the week's done points ÷ days since Monday (1–7), one decimal | — | none |

- Days left: `NORMAL` counts the weekdays from today to Sunday, `EXTREME` every day left (at least 1).
- A percentage is done ÷ out of, rounded; 0 when there is nothing to do — no test.
- Today's daily tasks count once, in the projection, never also as "before today".

## Columns — Todo and Done

Two columns for two statuses: a `TODO` task's card sits in Todo, a `DONE` one's in Done. `BACKLOG` tasks are in the backlog (see Backlog); `EXPIRED` ones aren't shown. Each column's header counts its cards.

Tested in `boardCardUtils.test.ts` › toBoardCards.

### Order

Todo runs by kind: one-offs first, then daily habits, then weekly habits, then project steps. Within a kind, a group — one habit's instances, or one project's steps — stays together: groups rank by their earliest `createdAt` and run in instance order (copy number, step number); a one-off ranks by its own `createdAt`. Ties go to `createdAt`, then id.

Done runs by when each task was done, the latest first; a card dragged to Done lands on top at once.

Tested in `taskUtils.test.ts` › sortTasks, sortDoneTasks.

### Cards

Every card has the same layout, top to bottom and left to right:

- **Kind** — the kind's icon and name; a step shows its project's name instead
- **Properties** (top right) — by kind, below
- **Title**
- **Description** — hidden once done
- **Progress** (bottom left) — by kind, below; a one-off has none
- **Size** — the task's size and its points

A Done card is the same card, settled: dimmed, its title struck through.

**Habit**

- Properties: its plan line — Daily × N or Weekly × N, from the plan's line for its template
- Progress: one dot per instance the line has this week, in order (a daily line: N on each day it runs — weekdays in `NORMAL`, every day in `EXTREME`). A dot is filled when that instance is done, empty when not, and ringed on the card's own instance.

Tested in `taskUtils.test.ts` › computeHabitWeeks.

**Project step**

- Properties: Step n/N — its number, and its project's count of steps
- Progress: its project's path, one segment per step in order. A segment is filled when that step is done, empty when not, and ringed on the card's own step; a step dragged to Done fills at once.

Tested in `boardCardUtils.test.ts` › toBoardCards; `boardService.int.test.ts` › fetchBoard.

**One-off**

- Properties: its quadrant on the priority matrix
- Progress: none

Tested in `boardCardUtils.test.ts` › toBoardCards.

## Backlog

> **Designed, not built yet** — mockup `design/mockup/mockup-board-backlog-grouping.html` (PR #109, amended in #114). Today the backlog is a flat list of board cards.

The plan's `BACKLOG` tasks: the habit instances not on the board yet, and the project steps scheduled this week. A one-off never waits here — tracking puts it straight in Todo, and off the board it lives on the priority matrix.

### Count

The backlog's entry and its header show how many tasks wait: every staged task, not every group. Past 8 it reads `8+`; its accessible name keeps the real number. An empty backlog counts 0.

### Groups

A habit's staged instances are one group, a project's staged steps another. Habits come first, daily then weekly, then projects; within each, groups rank by their earliest `createdAt`, as in Todo.

A group shows one card, its next task — a habit's earliest instance, a project's lowest step — on a pile:

- **Pile** — one thin sheet under the card per task behind the next, at most three; none when the next is the last
- **+N more** (top right) — how many wait behind the next; nothing when it is the last

The card follows the board's layout (Columns › Cards) with three changes: **+N more** takes the properties' place, there is no size, and the progress mark's ringed dot or segment is the next task's.

### Open and expand

Both stay on the client: nothing is written.

- **Open / close** — the backlog opens from its entry and starts closed on every visit. Only its visible side takes focus: opening moves focus into it, closing moves it back to the entry.
- **Expand a project** — a project's **+N more ⌄** opens its queue: the steps behind the next, in step order, read-only; the pile gives way to the queue. A habit's **+N more** doesn't open — the instances behind its next are the same task. Pulling the next one moves the queue up; when one step is left, the group is a single card again.

Taking a task out of the backlog — dragging it to Todo or Done, or ↑ Todo on mobile — is a write (Write › Pull): it always takes the group's next task.
