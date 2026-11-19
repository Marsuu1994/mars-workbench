# Board (/kanban)

The board is where the user works through the week. Each time a habit runs this week, the plan has one task for it (a *habit task*). Habit tasks and this week's project steps wait in the backlog until the user pulls them into Todo; one-offs go straight into Todo. As the user finishes tasks, they move them to Done.

Spec v2 (`specs/README.md`): every item starts with an ID, and each test that checks it puts that ID in its title.

## States

Opening `/kanban` runs the sync first (`specs/shared.md`). The page then shows one of three screens, depending on what the server sends back.

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
- *(pending)* **COL-5** When Todo is empty and Done holds at least one task finished today (in `KANBAN_TZ`), Todo shows a dashed box on both widths: a title saying the day is clear, then two sentences, that everything pulled for today is done and that the user can pull more from the backlog or call it a day. It has no button or link. A card finished from Todo counts at once, so the box shows as soon as the last card lands on Done. When nothing has been finished today, an empty Todo shows nothing, as it does now.

## Task cards

- **CARD-1** Every card shows, from top to bottom:
  - kind: what kind of task it is, with its details beside it; a project step shows its project's name in place of the kind
  - title: the task's title
  - description: the task's description, cut off after two lines
  - progress and size: the kind's progress, then the task's size with its points
- **CARD-2** A card in Done is dimmed, its title is struck through and its description is hidden. It can't be dragged (R4).
- *(removing)* **CARD-3** Replaced by CARD-8. **Habit cards.**
  - details: how often the habit runs, Daily × N or Weekly × N
  - progress: the week's dots, and how many of them are done out of the total
  - dots: one for each time the habit runs this week. A daily habit gets N for each day it runs (weekdays in `NORMAL` mode, every day in `EXTREME` mode); a weekly habit gets N. A dot is filled when its task is done and empty when it isn't, and the card's own task has a ring around its dot.
  - off the plan: if the habit is no longer on the plan, its cards show no details and no progress
- *(pending)* **CARD-8** **Habit cards.**
  - details: how often the habit runs, Daily × N or Weekly × N
  - progress: the week's dots alone, with no count of how many are done beside them. A screen reader reads the dots as how many are done out of the total.
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
- *(removing)* **BL-3** Replaced by BL-8. The strip or the pill, and the header of the panel or the sheet, show how many tasks are waiting.
- *(pending)* **BL-8** The strip or the pill, and the header of the panel or the sheet, show how many tasks are waiting: every habit task and every project step in the backlog, not how many groups there are. Up to 8 they show the number, 0 included; past 8 they show **8+**. A screen reader always hears the real number.
- **BL-4** The backlog is closed every time the page loads; the page doesn't remember whether it was open.
- **BL-5** Keyboard and screen-reader users only reach the part of the backlog that's showing: Tab skips the panel while it's closed, and skips the strip while the panel is open. Opening the backlog moves focus to its close button, and closing it moves focus back to the strip or the pill. When the page first loads, focus stays where it is.
- *(removing)* **BL-6** Replaced by BL-9, BL-16 and BL-10. The backlog's cards are sorted:
  - by kind: daily habits first, then weekly habits, then project steps
  - by group, within a kind: one habit's tasks or one project's steps stay next to each other, and groups come in the order their first task was created
  - in order, within a group: copy 1, 2, 3… or step 1, 2, 3…
  - ties: anything still tied goes by when it was created, then by id

  How they look at each width:
  - desktop: the same cards as the board, which the user drags out of the panel
  - mobile: full-width cards with ↑ Todo next to the title, which can't be dragged — so on mobile a backlog task reaches Done only through Todo
- *(removing)* **BL-7** Replaced by BL-15. When the backlog is empty, the desktop strip shows 0 and the panel shows an empty message. On mobile the pill disappears; the sheet shows its empty message only when the user pulls its last task while it's open.
- *(pending)* **BL-15** When the backlog is empty, its entry stays on both widths: the desktop strip and the mobile pill, and the header of the panel or the sheet, show 0 (BL-8). Opened, the panel or the sheet shows a dashed box in place of the cards: a title saying everything is on deck, then two sentences, that the week's plan is all on the board and that the user can adjust the plan to add more or call it a week. It has no button or link, and the hint about dragging or tapping a task is gone. When the user pulls the last task while it's open, it stays open and the box takes the cards' place.

### Groups

- *(pending)* **BL-9** The backlog's tasks wait in groups: one habit's tasks in the backlog are one group, and one project's steps in the backlog are another. On both widths each group is one card, showing the group's next task: a habit's lowest copy, or a project's lowest step. A group with only one task is a plain card; when more tasks wait behind its next one, its card sits on a pile of them (BL-11). The groups sit in two sections, Habits and then Projects, and a section with no group in it isn't shown.
- *(pending)* **BL-16** The groups are sorted:
  - Habits: daily habits first, then weekly habits; within a kind, groups come in the order their first task was created
  - Projects: groups come in the order their first step was created
  - ties: anything still tied goes by when it was created, then by id
- *(pending)* **BL-10** A backlog card shows, from top to bottom:
  - kind: a habit card shows its kind, and a step card its project's name; neither shows details (no Daily × N or Weekly × N, no step n/N)
  - title: the next task's title
  - description: the next task's description
  - progress: a habit's week dots, or the project's path, with the next task's dot or step ringed. No size and no count of how many are done; a screen reader reads the dots or the path as how many are done out of the total.

  How they work at each width:
  - desktop: the user drags the card out of the panel
  - mobile: the card has ↑ Todo and can't be dragged, so on mobile a backlog task reaches Done only through Todo
- *(pending)* **BL-11** A group with tasks behind its next one shows **+N more** on its card, N being how many are behind, and under the card one thin sheet for each of them, at most three. The sheets have no text and can't be tapped. A group's last task shows neither.
- *(pending)* **BL-12** A project's **+N more** has a chevron, and opens the project's queue (A8): in place of the sheets, a row for each step behind the next one, in step order, each showing its step number and title. Pressing it again closes the queue. A habit's **+N more** is text only and opens nothing. Closing the backlog (A3) closes every open queue, so the backlog always opens with its queues closed.
- *(pending)* **BL-13** When a group's next task leaves the backlog, the group's card shows the task after it: **+N more** goes down by one, and the sheets under it go down by one once fewer than three are behind. When its last task leaves, the group's card is gone, and its section too once no group is left in it.
- *(pending)* **BL-14** On desktop, as soon as the user lifts a backlog card to drag it, its group shows the task after it (BL-13), as if the top card had come off the pile. If the drag is cancelled, the lifted card goes back on top and the group is as it was. When the lifted card is the last task in the backlog, the panel just stays empty, its hint still showing, until the card is dropped on the board: only then does the box of an empty backlog show (BL-15).

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
| *(pending)* A8 | Open or close a project's queue | **+N more** with its chevron, on a project's backlog card | — | the steps behind its next one show in place of the sheets under it, or are hidden again (BL-12) |

### A move

What happens when a card moves (A4–A7):

- *(removing)* **MV-1** Replaced by MV-5. The card moves straight away, before the server answers: to the top of Done, or to its place in Todo (sorted as in COL-2). At the same moment:
  - the counts follow it: the column it leaves and the one it lands in change their header counts (COL-1), and a card leaving the backlog takes the backlog's count down by one (BL-3)
  - the card's progress, when it lands on Done: its dot or segment fills (CARD-7), and a habit card's count of done tasks goes up by one
- *(pending)* **MV-5** The card moves straight away, before the server answers: to the top of Done, or to its place in Todo (sorted as in COL-2). At the same moment:
  - the counts follow it: the column it leaves and the one it lands in change their header counts (COL-1), and a card leaving the backlog takes the backlog's count down by one (BL-8)
  - the card's progress, when it lands on Done: its dot or segment fills (CARD-7), and a screen reader reads a habit card's dots as one more done
- **MV-2** The server saves the new status. Moving a card to Done records when it was finished; moving it to Todo clears that.
- **MV-3** When the server answers, the page reloads its data, and only then does the progress dashboard (Progress) count the move:
  - pulled into Todo: today's total goes up by one, since today counts every task out of the backlog
  - finished from Todo: today's done count and the week's go up by one, and today's points and the week's go up by the task's points
  - finished from the backlog: all of the above, today's total included

  A one-off moved to Done also leaves the priority matrix.
- **MV-4** If the server refuses a move, only that card goes back to where it was. While other cards are still saving, it goes back once they have saved.

## Rules

- **R1** The server only moves a task forward: Backlog → Todo, Backlog → Done, or Todo → Done. It refuses any other move, so finished work stays counted.
- **R2** The server only moves a task that's on the plan. A one-off still on the priority matrix gets onto the board by being tracked for this week, never by a move.
- **R3** The server only moves the user's own tasks.
- **R4** On the board, a card in Done can't be dragged.
- **R5** On the board, nothing can be dropped into the backlog.
- *(pending)* **R6** On the board, only a group's next task can be pulled out of the backlog: the steps in a project's queue can't be dragged and have no ↑ Todo. This limit is the board's alone. The server moves any task in the backlog, whatever its place in its group (R1), so writes from outside the board, such as Claude's over MCP, aren't held to it.

When the server refuses a move, the card goes back as in MV-4.

## Journeys

- **J1 New user**:
  - the empty board (ST-1): it asks for a first plan
  - start a plan (A1): the plan page opens
- **J2 Returning user**:
  - the empty board (ST-2): it shows last week's recap
  - start this week's plan (A1): the plan page opens
- *(removing)* **J3 A week's work - desktop**, with a project step and a habit task in the backlog, replaced by J5:
  - the board (ST-3): Todo and Done are empty, and nothing is done today
  - open the backlog (A2): the panel lists the step and the habit task, and its count matches the strip's
  - pull the step into Todo (A4): it's in Todo; Todo's count goes up by one and the backlog's goes down by one. Once saved, today's total goes up by one (MV-3).
  - finish the habit task from the backlog (A6): it's on top of Done, its dot fills and the card counts it as done; Done's count goes up and the backlog's goes down. Once saved, today's done count, total and points, and the week's done count and points, all count it.
  - finish the step (A7): it's on top of Done and its segment fills; Todo's count goes down and Done's goes up. Once saved, today's and the week's done counts and points count it.
  - close the backlog (A3): the strip shows what's left
  - reload: both cards are still in Done, and the progress is the same
- *(removing)* **J4 A week's work - mobile**, with a project step and a habit task in the backlog, replaced by J6:
  - the board (ST-3): Todo and Done are empty, and nothing is done today
  - open the backlog (A2): the sheet lists the step and the habit task
  - pull both into Todo, tapping ↑ Todo on each (A5): each card leaves the sheet for Todo, the sheet's count goes down by one and Todo's goes up, and the sheet stays open for the next. Once saved, today's total goes up by one. After the last one the sheet shows its empty message (BL-7).
  - close the sheet (A3): with nothing left, the pill is gone (BL-7)
  - finish the step, dragging it from Todo onto Done (A7): it's first in Done and its segment fills; Todo's count goes down and Done's goes up. Once saved, today's and the week's done counts and points count it.
  - reload: the habit task is still in Todo, the step in Done, and the progress is the same
- *(pending)* **J5 A week's work - desktop**, with a habit's two tasks and a project's two steps in the backlog:
  - the board (ST-3): Todo and Done are empty, and nothing is done today
  - open the backlog (A2): the panel shows two groups, the habit under Habits and the project under Projects. Each card shows its group's next task with **+1 more**, on a pile of one sheet. The count reads 4, as on the strip.
  - open the project's queue (A8): the step behind its next one shows in place of its pile
  - pull the project's next step into Todo (A4): it's in Todo; Todo's count goes up by one and the backlog's goes down by one. The project's card now shows its second step as a plain card, with no **+N more** and no queue (BL-13). Once saved, today's total goes up by one (MV-3).
  - pull the habit's next task into Todo (A4): the same, and the habit's card now shows its second task as a plain card
  - finish the habit task (A7): it's on top of Done, its dot fills and a screen reader reads the habit's dots as one more done; Todo's count goes down and Done's goes up. Once saved, today's and the week's done counts and points count it.
  - close the backlog (A3): the strip shows 2
  - reload: the step is still in Todo and the habit task in Done, and the progress is the same; the strip shows 2, and opened, the backlog holds both groups as plain cards
- *(pending)* **J6 A week's work - mobile**: J5 on a phone, with the same data and the same steps, except:
  - open the backlog (A2): the pill opens the sheet
  - pull each task (A5): tap ↑ Todo on its card in place of dragging it, and the sheet stays open for the next
  - close the backlog (A3): the pill shows 2
- *(pending)* **J11 Finish from the backlog - desktop-only**, with a habit's two tasks in the backlog:
  - the board (ST-3): Todo and Done are empty, and nothing is done today
  - open the backlog (A2): the habit's card shows **+1 more**, on a pile of one sheet
  - drag the habit's next task onto Done (A6): it's on top of Done, its dot fills and a screen reader reads the habit's dots as one more done; Done's count goes up and the backlog's goes down, and the habit's card shows its second task as a plain card. Once saved, today's done count, total and points, and the week's done count and points, all count it (MV-3).
  - reload: the task is still in Done, and the progress is the same
- *(pending)* **J7 Wrap up the day - desktop**, with a habit task and a project step in Todo, the backlog holding more, and nothing done today:
  - the board (ST-3): Todo shows the two cards and Done is empty
  - finish the habit task (A7): it's on top of Done and its dot fills; the step is still in Todo
  - finish the step (A7): it's on top of Done and its segment fills, and the empty Todo shows that the day is clear (COL-5)
  - reload: Todo still shows that the day is clear, and Done holds both tasks
- *(pending)* **J8 Wrap up the day - mobile**: J7 on a phone, with the same data and the same steps; the box shows in Todo's row (COL-4).
- *(pending)* **J9 Clear the backlog - desktop**, with a habit's two tasks in the backlog:
  - the board (ST-3): the strip shows 2
  - open the backlog (A2): the habit's card shows **+1 more**, on a pile of one sheet, and the count reads 2
  - pull its next task into Todo (A4): the habit's card shows its second task as a plain card, and the count reads 1
  - lift the last card (BL-14): the panel is empty, its hint still showing
  - drop it on Todo (A4): the panel shows that everything is on deck, with no hint, and the count reads 0 (BL-15)
  - close the backlog (A3): the strip stays and shows 0
  - open it again (A2): the panel shows that everything is on deck again
- *(pending)* **J10 Clear the backlog - mobile**: J9 on a phone, with the same data and the same steps, except:
  - open the backlog (A2): the pill opens the sheet
  - pull each task (A5): tap ↑ Todo on its card in place of the drag, so there is no lift step. After the first tap the count reads 1. After the second, the sheet stays open and shows that everything is on deck, with no hint, and the count reads 0 (BL-15).
  - close the backlog (A3): the pill stays and shows 0
