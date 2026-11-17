# Board (/kanban)

The board is where the user works through the week. Each time a habit runs this week, the plan has one task for it (a *habit task*). Habit tasks and this week's project steps wait in the backlog until the user pulls them into Todo; one-offs go straight into Todo. As the user finishes tasks, they move them to Done.

Spec v2 (`flows/README.md`): every item starts with an ID, and each test that checks it puts that ID in its title.

## States

Opening `/kanban` runs the sync first (`flows/shared.md`). The page then shows one of three screens, depending on what the server sends back.

- **ST-1 New user** — The user has no plan for this week and no ended plan waiting (neither `ACTIVE` nor `PENDING_UPDATE`). The server sends nothing. The page shows an empty board that asks for a first plan, and its button opens the plan page (A1).
- **ST-2 Returning user** — Last week's plan has ended (`PENDING_UPDATE`) and there is no plan for this week yet. The server sends a recap of last week that counts every task on that plan: habit tasks, project steps and one-offs, the expired ones included. The empty board shows the recap, and its button opens the plan page for this week's plan (A1). The recap shows:
  - completion rate: what share of last week's tasks were done
  - tasks done: how many tasks were done, out of how many
  - points earned: how many points the done tasks earned
- **ST-3 Active plan** — There is a plan for this week (`ACTIVE`), and the page shows the board. The server sends:
  - the plan: its week, its mode, and its habits with how often each one runs
  - every task on the plan except the expired ones
  - each project that has a step on the plan, with all of its steps (the step cards draw their path from them)
  - the progress counts (Progress)

## Columns

- **COL-1** The board has two columns, Todo and Done. Tasks waiting in the backlog appear in neither, and expired tasks appear nowhere. Each column's header shows how many cards it has.
- **COL-2** Todo is sorted:
  - by kind: one-offs first, then daily habits, then weekly habits, then project steps
  - by group, within a kind: one habit's tasks or one project's steps stay next to each other, and groups come in the order their first task was created; a one-off comes in the order it was created
  - in order, within a group: copy 1, 2, 3… or step 1, 2, 3…
  - ties: anything still tied goes by when it was created, then by id
- **COL-3** Done is sorted by when each task was finished, the most recent at the top.
- **COL-4** On mobile the two columns are stacked, and each is a row of mini cards (CARD-6) that scrolls sideways.

## Task cards

- **CARD-1** Every card shows, from top to bottom:
  - kind: what kind of task it is, with its details beside it; a project step shows its project's name in place of the kind
  - title: the task's title
  - description: the task's description, cut off after two lines
  - progress and size: the kind's progress, then the task's size with its points
- **CARD-2** A card in Done is dimmed, its title is struck through and its description is hidden. It can't be dragged (R4).
- **CARD-3** **Habit cards.**
  - details: how often the habit runs, Daily × N or Weekly × N
  - progress: the week's dots, and how many of them are done out of the total
  - dots: one for each time the habit runs this week. A daily habit gets N for each day it runs (weekdays in `NORMAL` mode, every day in `EXTREME` mode); a weekly habit gets N. A dot is filled when its task is done and empty when it isn't, and the card's own task has a ring around its dot.
  - off the plan: if the habit is no longer on the plan, its cards show no details and no progress
- **CARD-4** **Project step cards.**
  - details: n/N, the step's number and how many steps the project has
  - progress: the project's path, one segment per step in order. A segment is filled when its step is done and empty when it isn't, and the card's own step has a ring around it.
  - no project: if the board didn't get the step's project, the card shows no details and no progress
- **CARD-5** **One-off cards.**
  - details: which quadrant of the priority matrix the one-off is in
  - progress: none
- **CARD-6** A mini card, on the mobile board, shows only the kind, the title (up to two lines), the progress and the size: no details and no description.
- **CARD-7** When a card lands on Done, its dot or segment fills straight away, without waiting for the server.

## Backlog

- **BL-1** The backlog holds the tasks waiting to be pulled onto the board: this week's habit tasks that aren't on it yet, and the project steps scheduled for this week. It never holds one-offs: tracking a one-off for this week puts it straight into Todo.
- **BL-2** On desktop the backlog is a narrow strip along the board's right edge, which opens into a panel. On mobile it's a pill above the tab bar, which opens a sheet from the bottom with the board dimmed behind it.
- **BL-3** The strip or the pill, and the header of the panel or the sheet, show how many tasks are waiting.
- **BL-4** The backlog is closed every time the page loads; the page doesn't remember whether it was open.
- **BL-5** Keyboard and screen-reader users only reach the part of the backlog that's showing: Tab skips the panel while it's closed, and skips the strip while the panel is open. Opening the backlog moves focus to its close button, and closing it moves focus back to the strip or the pill. When the page first loads, focus stays where it is.
- **BL-6** The backlog's cards are sorted:
  - by kind: daily habits first, then weekly habits, then project steps
  - by group, within a kind: one habit's tasks or one project's steps stay next to each other, and groups come in the order their first task was created
  - in order, within a group: copy 1, 2, 3… or step 1, 2, 3…
  - ties: anything still tied goes by when it was created, then by id

  How they look at each width:
  - desktop: the same cards as the board, which the user drags out of the panel
  - mobile: full-width cards with ↑ Todo next to the title, which can't be dragged — so on mobile a backlog task reaches Done only through Todo
- **BL-7** When the backlog is empty, the desktop strip shows 0 and the panel shows an empty message. On mobile the pill disappears; the sheet shows its empty message only when the user pulls its last task while it's open.

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
| A1 | Start a plan | the empty board's button | — | the plan page opens |
| A2 | Open the backlog | the strip (desktop) or the pill (mobile) | — | the panel or the sheet opens, and focus moves into it (BL-5) |
| A3 | Close the backlog | the close button of the panel or the sheet | — | it closes, and focus goes back to the strip or the pill (BL-5) |
| A4 | Pull to Todo (desktop) | drag a backlog card onto Todo | `updateTaskStatusAction` → `TODO` | the card moves (A move) |
| A5 | Pull to Todo (mobile) | tap ↑ Todo on a backlog card | `updateTaskStatusAction` → `TODO` | the card moves (A move), and the sheet stays open for the next one |
| A6 | Finish from the backlog | drag a backlog card onto Done (desktop) | `updateTaskStatusAction` → `DONE` | the card moves (A move) |
| A7 | Finish | drag a Todo card onto Done | `updateTaskStatusAction` → `DONE` | the card moves (A move) |

### A move

What happens when a card moves (A4–A7):

- **MV-1** The card moves straight away, before the server answers: to the top of Done, or to its place in Todo (sorted as in COL-2). The backlog's count goes down at the same moment.
- **MV-2** The server saves the new status. Moving a card to Done records when it was finished; moving it to Todo clears that.
- **MV-3** When the server answers, the page reloads its data, and only then does progress count the move. A one-off moved to Done also leaves the priority matrix.
- **MV-4** If the server refuses a move, only that card goes back to where it was. While other cards are still saving, it goes back once they have saved.

## Rules

- **R1** The server only moves a task forward: Backlog → Todo, Backlog → Done, or Todo → Done. It refuses any other move, so finished work stays counted.
- **R2** The server only moves a task that's on the plan. A one-off still on the priority matrix gets onto the board by being tracked for this week, never by a move.
- **R3** The server only moves the user's own tasks.
- **R4** On the board, a card in Done can't be dragged.
- **R5** On the board, nothing can be dropped into the backlog.

When the server refuses a move, the card goes back as in MV-4.

## Journeys

- **J1 New user** — The new user sees the empty board (ST-1) and starts a plan (A1).
- **J2 Returning user** — The returning user sees last week's recap (ST-2) and starts this week's plan (A1).
- **J3 A week's work** (desktop) — On the board (ST-3), the user opens the backlog and looks it over (A2), pulls a step into Todo (A4), finishes a habit task straight from the backlog and sees its dot fill (A6), then finishes the step and sees its segment fill (A7), and closes the backlog (A3). After a reload every move is still there, and today's progress counts them.
- **J4 A week's work** (mobile) — On the board (ST-3), the user opens the backlog (A2) and taps ↑ Todo on two cards, the sheet staying open between them (A5), then closes it (A3). They finish the step, dragging it from Todo onto Done (A7). After a reload the habit task is still in Todo and the step in Done, and today's progress counts the step.
