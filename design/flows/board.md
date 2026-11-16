# Board (/kanban)

The week's working surface: habit instances, project steps and one-offs move from the backlog to Todo to Done.

Spec v2 (`flows/README.md`): each item's ID is named by the test that holds it to the text.

## States

Entering `/kanban` syncs first (`flows/shared.md`); a plan whose week has ended moves from `ACTIVE` to `PENDING_UPDATE` there. The page is then in one of three states:

- **ST-1 New user** — no `ACTIVE` plan and none `PENDING_UPDATE`: the empty board asks for a first plan. Nothing more is read.
- **ST-2 Returning user** — no `ACTIVE` plan, a `PENDING_UPDATE` one: the empty board shows that plan's recap.
- **ST-3 Active plan** — an `ACTIVE` plan for this week: the board. One read returns the plan (its week, its mode, its habit templates and their frequencies), its tasks (every one but `EXPIRED`), the projects behind its steps (each with its whole path) and the progress counts. Nothing is read again until a write lands.

## Empty board

- **EMPTY-1** The new user's empty board asks for a first plan; its button starts one (A1).
- **EMPTY-2** The returning user's empty board shows last week's recap, and its button starts this week's plan (A1).

The recap, over all of last week's tasks — habit instances, project steps and one-offs, expired included:

- **RECAP-1** completion rate — the done ones ÷ all of them
- **RECAP-2** tasks done — done / all
- **RECAP-3** points earned — the done ones' points
- **RECAP-4** *(bug)* The recap counts habit instances only, leaving out last week's steps and one-offs.

## Columns

- **COL-1** Two columns: Todo holds the `TODO` tasks, Done the `DONE` ones; `BACKLOG` tasks wait in the backlog, `EXPIRED` ones aren't shown. Each header counts its column's cards.
- **COL-2** Todo runs by kind: one-offs, then daily habits, then weekly habits, then project steps. Within a kind a group — one habit's instances, one project's steps — stays together: groups rank by their earliest `createdAt` and run in instance order (copy number, step number); a one-off ranks by its own `createdAt`. Ties go to `createdAt`, then id.
- **COL-3** Done runs by when each task was done, the latest first.
- **COL-4** On mobile the columns stack, each a row of mini cards (CARD-6).

## Task cards

- **CARD-1** A card shows, top to bottom: its kind (a step shows its project's name instead) and its properties · its title · its description · its progress and its size with points. Its description is cut to two lines.
- **CARD-2** A Done card is dimmed, its title struck through, its description hidden. It has no drag handle (R4).
- **CARD-3** **Habit** — properties: its plan line, Daily × N or Weekly × N. Progress: the week's dots (CARD-4) and done / target. A habit whose template has no line on the plan shows neither.
- **CARD-4** **A habit's dots** — one per instance its plan line has this week, in order: a daily line has N on each day it runs (weekdays in `NORMAL`, every day in `EXTREME`), a weekly line N. A dot is filled when that instance is done, empty when not, and ringed on the card's own instance.
- **CARD-5** **Project step** — properties: Step n/N, its number and its project's count of steps. Progress: its project's path, one segment per step in step order — filled when done, empty when not, ringed on the card's own step. A step whose project isn't in the read shows neither.
- **CARD-6** **One-off** — properties: its quadrant on the priority matrix. No progress.
- **CARD-7** A mini card (mobile board) shows only the kind, the title (two lines), the progress and the size: no properties, no description.
- **CARD-8** A card's dot or segment fills the moment it lands on Done, before the server answers.

## Backlog

- **BL-1** Holds the plan's `BACKLOG` tasks: habit instances not on the board yet, and the project steps scheduled this week. Never one-offs — tracking puts them straight in Todo.
- **BL-2** The entry: on desktop a collapsed strip on the board's right edge, opening a panel; on mobile a pill above the tab bar, opening a bottom sheet over it, the board behind a scrim.
- **BL-3** The entry and the header count the staged tasks.
- **BL-4** Closed whenever the page loads; whether it was open isn't remembered.
- **BL-5** Only its visible side takes focus: Tab and screen readers never reach the collapsed panel, or the strip while the panel is open. Opening moves focus to the panel's close control, closing moves it back to the entry; the first render leaves focus where it is.
- **BL-6** Cards run in Todo's order (COL-2). On desktop they are the board's cards, dragged out of the panel; on mobile they are full-width cards with ↑ Todo beside the title, not draggable — so on mobile a backlog task reaches Done only through Todo.
- **BL-7** Empty: on desktop the strip shows 0 and the panel an empty state; on mobile the pill is hidden, and the sheet's empty state shows only if its last task is pulled while it is open.

## Progress

> **As is.** Phase 2 redesigns the dashboard; this section is kept as it stands, without IDs.

The server counts; the client turns the counts into percentages and the daily average. "Today" is in `KANBAN_TZ` (Los Angeles), whatever the server's timezone.

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
- Done counts never drop with plan or template edits; the projection follows the plan's current templates.

## Actions

| ID | Action | Where | Server action | Result |
| --- | --- | --- | --- | --- |
| A1 | Start a plan | the empty board's button | — | opens the plan page |
| A2 | Open the backlog | the strip (desktop), the pill (mobile) | — | the panel or the sheet opens; focus per BL-5 |
| A3 | Close the backlog | the panel's or the sheet's close control | — | it closes; focus per BL-5 |
| A4 | Pull to Todo | drag a backlog card onto Todo (desktop) | `updateTaskStatusAction` → `TODO` | a move (MV) |
| A5 | Pull to Todo | ↑ Todo on a backlog card (mobile) | `updateTaskStatusAction` → `TODO` | a move (MV); the sheet stays open for the next |
| A6 | Finish from the backlog | drag a backlog card onto Done (desktop) | `updateTaskStatusAction` → `DONE` | a move (MV) |
| A7 | Finish | drag a Todo card onto Done | `updateTaskStatusAction` → `DONE` | a move (MV) |

### A move

- **MV-1** At once the card is in its new place — on top of Done, or in Todo by its kind (COL-2) — and the backlog's count drops.
- **MV-2** The server saves the status: a move to Done stamps when it was done, a move to Todo clears it.
- **MV-3** Once the server answers, the page's data reloads and progress counts the move — never before. A one-off moved to Done leaves the priority matrix too.
- **MV-4** If it fails, only that card goes back; other moves in flight stay.

## Rules

- **R1** The server moves a task forward only — Backlog → Todo, Backlog → Done, Todo → Done — so what was done stays counted. It refuses anything else.
- **R2** The server moves only a task on the plan: a one-off still on the priority matrix reaches the board through Track This Week, never through a move.
- **R3** The server moves only the user's own task.
- **R4** On the board, a Done card has no drag handle.
- **R5** On the board, the backlog takes no drops.

A refused move fails like any other (MV-4).

## Journeys

- **J1 Entry** — each state shows its screen (ST-1, ST-2, ST-3); A1 opens the plan page.
- **J2 A week's work** (desktop) — A2, looking over the backlog → A4 a step → A6 a habit instance (its dot fills) → A7 the step (its segment fills) → reload: every move stayed, and today's progress counts them → A3.
- **J3 Mobile pull** (mobile) — A2 → A5 twice, the sheet staying open → A3 → reload: both in Todo.
