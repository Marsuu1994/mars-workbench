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
- *(removing)* **ST-3 Active plan** — replaced by ST-4. There is a plan for this week (`ACTIVE`), and the page shows the board. The server sends:
  - the plan: its week, its mode, and its habits with how often each one runs
  - every task on the plan except the expired ones
  - each project that has a step on the plan, with all of its steps (the step cards draw their path from them)
  - the progress counts (Progress)
- *(pending)* **ST-4 Active plan** — There is a plan for this week (`ACTIVE`), and the page shows the board. The server sends:
  - the plan: its week, its mode, and its habits with how often each one runs
  - every task on the plan except the expired ones
  - each project that has a step on the plan, with all of its steps (the step cards draw their path from them)
  - for each day of the plan's week before today (in `KANBAN_TZ`), how many of that day's daily habit tasks expired without being done: the past days' rings count them (RING-2)

  It no longer sends the progress counts: the page counts each day's ring from the tasks it holds (RING-2).

## Day rings

The top of the board is a row of rings, one for each day of the plan's week, Monday to Sunday. A day's ring is that day's work: the whole ring is everything planned for the day, and each task done that day fills part of it. The row replaces the progress dashboard (Progress), on both widths.

- *(pending)* **RING-1** Which days the row shows, and how:
  - each cell, on both widths: today's cell is wider than the others, framed, and holds its ring, the word Today and its count, **d of p done**, d being what it has done and p what it has planned (RING-2). Every other cell holds the day's short name over its ring.
  - desktop: all seven days, Monday to Sunday.
  - mobile: today's cell, and as many days before today as fit beside it. The row runs the screen's width less 20 px on each side, its cells sit 4 px apart, today's cell is kept at least 132 px wide and each other cell at least 54 px, and the cells share what is left equally. At 320, 375, 390 and 430 px that is 2, 3, 3 and 4 other days. Early in the week, when fewer days come before today than there is room for, the days after today fill the rest, so the row always shows the same number of cells at one width.
  - the rings keep their size whatever the screen's width; only the number of cells changes.
- *(pending)* **RING-2** What a day's ring counts, in `KANBAN_TZ`. This counting is a temporary workaround: nothing records yet what was planned for each day, so the page works it out from the tasks it holds. It stands until the daily rhythm keeps a snapshot of each day's total and done counts; the board design's item in `design/tracker.md` says where that is designed.
  - done, for every day: the tasks on the plan finished that day, by when they were finished, of every kind.
  - planned, for today: the tasks done today, and every card in Todo. A task in the backlog isn't planned for today until it is pulled into Todo, so pulling a card adds one to today's planned count.
  - planned, for a day before today: the tasks done that day, and that day's daily habit tasks that expired without being done (ST-4).
  - planned, for a day after today: nothing yet; the day's work isn't known until it comes.
  - when a day ends: its planned count is counted as a past day's from then on, so under this workaround it can change overnight. The Todo cards that don't expire with the day (weekly habit tasks, project steps and one-offs) stop counting for it, since they wait in Todo for the next day. A daily habit task that wasn't done expires with the day wherever it was: it keeps counting if it was in Todo, and starts counting if it was never pulled out of the backlog. A ring that was closed in the evening can therefore show an empty part the next morning, and a ring left open can show as closed.
- *(pending)* **RING-3** How a ring is drawn:
  - the track: the whole ring is the day's planned count, and the part not done is an empty track.
  - the arcs: each done task adds an arc of the same length, in its kind's colour, the same colour as the left edge of its card. The arcs start at 12 o'clock and go clockwise, habits first, then project steps, then one-offs.
  - nothing planned: the ring is an empty track.
  - closed: when the day has something planned and everything planned is done, a ✓ sits in the ring's centre.
  - more done than planned: the ring is drawn full and counts as closed, whatever its count reads. RING-2's counting can't give more done than planned as it stands; this holds for the counting that replaces it.
- *(pending)* **RING-4** A screen reader reads each day's cell up to today as the day's name, then how many tasks are done out of how many are planned, then, for each kind that has any planned, how many of that kind are done out of how many: "Thu: 1 of 5 done — habits 1 of 2, steps 0 of 2, one-offs 0 of 1".
- *(pending)* **RING-5** When today's ring is closed (RING-3), today's cell stays marked as closed for as long as it is: its frame turns to the success colour, its ring holds the ✓, and its count reads **All N done**, N being today's planned count. A ring that is closed when the page loads shows the same, with no celebration (FX-4).
- *(pending)* **RING-6** Pulling a card into Todo after today's ring has closed opens it again: the ring shows an empty part, the ✓ goes, the frame loses its success colour, and the count reads **d of p done** again. Once the new card is done too, the ring closes again, with its celebration (FX-4).
- *(pending)* **RING-7** A day after today isn't a button and opens nothing: its ring is an empty track, and a screen reader reads its cell as the day's name alone.

### A day's list

- *(pending)* **DAY-1** Today's cell and each cell before it are buttons. Pressing one opens that day's list (A13); pressing the same cell again closes it (A14). Only one day's list is open at a time: pressing another day's cell closes the open list and opens that day's. While its list is open, the day's cell is drawn as selected.
- *(pending)* **DAY-2** Where the list opens:
  - desktop: in a panel floating under the row, below the day's cell, over the board. The board stays as it is behind it.
  - mobile: in a sheet that rises from the bottom, at most 70% of the screen's height, with the board dimmed behind it.
- *(pending)* **DAY-3** A day's list shows, from top to bottom:
  - its header: the day's name (**Today** for today), the day's count, **d of p done**, the same as its ring (RING-2), and a close button
  - a row for each task finished that day: the kind's icon and the task's title, and for a project step its project's name under the title. Habits come first, then project steps, then one-offs; within a kind, by when each was finished, the earliest first.
  - when nothing was finished that day: **Nothing yet** in place of the rows

  The list is read only: its rows can't be pressed, dragged or moved back (R7).
- *(pending)* **DAY-4** The open list closes when the user presses its close button, presses its day's cell again, presses anywhere outside it (on mobile, the dimmed board), or presses Esc (A14). Opening the backlog (A2) or selecting a card (A10) closes it too, and opening a day's list cancels a selected card (TAP-2).
- *(pending)* **DAY-5** Keyboard and screen-reader users: each day's cell that is a button can be reached with Tab and pressed with Enter or Space, and a screen reader hears whether its list is open. Opening a list moves focus to its close button, and closing it moves focus back to the day's cell.

## Columns

- *(removing)* **COL-1** — replaced by COL-6. The board has two columns, Todo and Done. Tasks waiting in the backlog appear in neither, and expired tasks appear nowhere. Each column's header shows how many cards it has.
- *(pending)* **COL-6** Which columns the board has. Tasks waiting in the backlog appear in neither, expired tasks appear nowhere, and each column's header shows how many cards it has.
  - desktop: two columns side by side, Todo and Done, each as tall as the board. Todo's header is tagged **Today**, and Done's **This week**: Done holds every task on the plan that is done, from every day of the week.
  - mobile: Todo only. A finished task leaves the board, and the user finds it in its day's list (DAY-3).
- **COL-2** Todo is sorted:
  - by kind: one-offs first, then daily habits, then weekly habits, then project steps
  - by group, within a kind: one habit's tasks or one project's steps stay next to each other, and groups come in the order their first task was created; a one-off comes in the order it was created
  - in order, within a group: copy 1, 2, 3… or step 1, 2, 3…
  - ties: anything still tied goes by when it was created, then by id
- **COL-3** Done is sorted by when each task was finished, the most recent at the top.
- *(removing)* **COL-4** — replaced by COL-7. On mobile the two columns are stacked, and each is a row of mini cards (CARD-6) that scrolls sideways.
- *(pending)* **COL-7** On mobile, Todo is a list of full-width cards, one under another, in Todo's order (COL-2). Each is the same card as on desktop (CARD-9).
- *(removing)* **COL-5** — replaced by COL-8. When Todo is empty and Done holds at least one task finished today (in `KANBAN_TZ`), Todo shows a dashed box on both widths: a title saying the day is clear, then two sentences, that everything pulled for today is done and that the user can pull more from the backlog or call it a day. It has no button or link. A card finished from Todo counts at once, so the box shows as soon as the last card lands on Done. When nothing has been finished today, an empty Todo shows nothing, as it does now.
- *(pending)* **COL-8** When Todo is empty and at least one task was finished today (in `KANBAN_TZ`), Todo shows a dashed box on both widths: a title saying the day is clear, then two sentences, that everything pulled for today is done and that the user can pull more from the backlog or call it a day. It has no button or link. It shows as soon as the last card has left Todo: once the card has landed in today's ring when it was completed with ✓ Complete (FX-2), or as soon as it is dropped on Done when it was dragged. It comes in with `fx-boot-in`, as it does whenever it appears, and ends where it rests; under reduced motion it appears at once. When nothing has been finished today, an empty Todo shows nothing.

## Task cards

This section is the board's one card, in Todo, in Done and in the backlog. How the backlog groups its cards and piles them is the Backlog section's (BL-9, BL-11, BL-12).

- *(removing)* **CARD-1** — replaced by CARD-9. Every card shows, from top to bottom:
  - kind: what kind of task it is, with its details beside it; a project step shows its project's name in place of the kind
  - title: the task's title
  - description: the task's description, cut off after two lines
  - progress and size: the kind's progress, then the task's size with its points
- *(pending)* **CARD-9** Every card, on both widths and in Todo, Done and the backlog, shows from top to bottom:
  - kind line: what kind of task it is; a project step shows its project's name in place of the kind, and a one-off shows its kind, a bar and the quadrant of the priority matrix it is in (**ONE-OFF | DO FIRST**). Nothing else stands on the line, apart from the backlog's **+N more** (BL-11).
  - title: the task's title
  - description: the task's description, cut off after two lines; none in Done (CARD-2)
  - progress: the kind's progress (CARD-10, CARD-11); a one-off has none
  - action, at the bottom right, by where the card is:
    - in Todo: a round mark that becomes ✓ Complete when the card is selected (TAP-1)
    - in the backlog: ↑ Todo, on both widths, which pulls the task into Todo (A9)
    - in Done: none

  No card shows the task's size or its points.
- **CARD-2** A card in Done is dimmed, its title is struck through and its description is hidden. It can't be dragged (R4).
- *(pending)* **CARD-12** Which cards can be dragged:
  - desktop: a card in Todo or in the backlog can be dragged as well as moved by its action (A4, A6, A15).
  - mobile: no card can be dragged. A card moves only by its action (CARD-9), so on mobile a backlog task reaches Done only through Todo.
- *(removing)* **CARD-8** — replaced by CARD-10. **Habit cards.**
  - details: how often the habit runs, Daily × N or Weekly × N
  - progress: the week's dots alone, with no count of how many are done beside them. A screen reader reads the dots as how many are done out of the total.
  - dots: one for each time the habit runs this week. A daily habit gets N for each day it runs (weekdays in `NORMAL` mode, every day in `EXTREME` mode); a weekly habit gets N. A dot is filled when its task is done and empty when it isn't, and the card's own task has a ring around its dot.
  - off the plan: if the habit is no longer on the plan, its cards show no details and no progress
- *(pending)* **CARD-10** **Habit cards.** The kind line says it's a habit and shows nothing about how often it runs.
  - progress: the week's dots alone, with no count of how many are done beside them. A screen reader reads the dots as how many are done out of the total.
  - dots: one for each time the habit runs this week. A daily habit gets N for each day it runs (weekdays in `NORMAL` mode, every day in `EXTREME` mode); a weekly habit gets N. A dot is filled when its task is done and empty when it isn't, and the card's own task has a ring around its dot, in Todo, Done and the backlog alike.
  - off the plan: if the habit is no longer on the plan, its cards show no progress
- *(removing)* **CARD-4** — replaced by CARD-11. **Project step cards.**
  - details: n/N, the step's number and how many steps the project has
  - progress: the project's path, one segment per step in order. A segment is filled when its step is done and empty when it isn't, and the card's own step has a ring around it.
  - no project: if the board didn't get the step's project, the card shows no details and no progress
- *(pending)* **CARD-11** **Project step cards.** The kind line shows the project's name and nothing about the step's number.
  - progress: the project's path, one segment per step in order. A segment is filled when its step is done and empty when it isn't, and the card's own step has a ring around it, in Todo, Done and the backlog alike. A screen reader reads the path as how many steps are done out of the total.
  - no project: if the board didn't get the step's project, the card shows no progress
- *(removing)* **CARD-5** — replaced by CARD-9. **One-off cards.**
  - details: which quadrant of the priority matrix the one-off is in
  - progress: none
- *(removing)* **CARD-6** — replaced by COL-7. A mini card, on the mobile board, shows only the kind, the title (up to two lines), the progress and the size: no details and no description.
- **CARD-7** When a card lands on Done, its dot or segment fills straight away, without waiting for the server.

### Tap twice to complete

A Todo card is finished in two presses, on both widths: one to select it, and a second on its ✓ Complete. Desktop keeps dragging as well (A6, A15).

- *(pending)* **TAP-1** Pressing anywhere on a Todo card selects it (A10). A selected card has a confirming frame, and its round mark turns into a filled ✓ with **Complete** beside it: together they are its ✓ Complete button. Its size and its place don't change, and nothing else on the board moves. At most one card is selected: pressing another Todo card moves the selection to it. Cards in Done and in the backlog can't be selected.
- *(pending)* **TAP-2** A selected card goes back to normal, with nothing finished, when the user presses it again anywhere but its ✓ Complete, presses anywhere outside the Todo cards, presses Esc, opens a day's list or opens the backlog (A11). Scrolling doesn't cancel it, and nothing cancels it on a timer. Left open on purpose (owner, 2026-11-19): whether a card stays selected once a drag starts. A selected card can be dragged like any other, and the implementation does whatever is simplest.
- *(pending)* **TAP-3** Only ✓ Complete finishes a card by pressing (A12). For 350 ms after it appears it ignores presses, so a quick double press on the round mark selects the card without finishing it.
- *(pending)* **TAP-4** Keyboard and screen-reader users: each Todo card can be reached with Tab. Enter on a card that isn't selected selects it; Enter on the selected card completes it, as ✓ Complete does, after the same 350 ms (TAP-3); Esc cancels the selection (TAP-2). On desktop, Space stays the key that lifts a card to drag it (A15). A screen reader hears whether the card is selected, and ✓ Complete is named after the task it finishes.

## Backlog

- **BL-1** The backlog holds the tasks waiting to be pulled onto the board: this week's habit tasks that aren't on it yet, and the project steps scheduled for this week. It never holds one-offs: tracking a one-off for this week puts it straight into Todo.
- **BL-2** On desktop the backlog is a narrow strip along the board's right edge, which opens into a panel. On mobile it's a pill above the tab bar, which opens a sheet from the bottom with the board dimmed behind it.
- **BL-8** The strip or the pill, and the header of the panel or the sheet, show how many tasks are waiting: every habit task and every project step in the backlog, not how many groups there are. Up to 8 they show the number, 0 included; past 8 they show **8+**. A screen reader always hears the real number.
- **BL-4** The backlog is closed every time the page loads; the page doesn't remember whether it was open.
- **BL-5** Keyboard and screen-reader users only reach the part of the backlog that's showing: Tab skips the panel while it's closed, and skips the strip while the panel is open. Opening the backlog moves focus to its close button, and closing it moves focus back to the strip or the pill. When the page first loads, focus stays where it is.
- *(pending)* **BL-20** No hint about dragging or tapping a task sits under the header of the panel or the sheet, on either width: the sections (BL-9), or the empty box (BL-19), come straight after it.
- *(removing)* **BL-15** — replaced by BL-19 and BL-20. When the backlog is empty, its entry stays on both widths: the desktop strip and the mobile pill, and the header of the panel or the sheet, show 0 (BL-8). Opened, the panel or the sheet shows a dashed box in place of the cards: a title saying everything is on deck, then two sentences, that the week's plan is all on the board and that the user can adjust the plan to add more or call it a week. It has no button or link, and the hint about dragging or tapping a task is gone. When the user pulls the last task while it's open, it stays open and the box takes the cards' place.
- *(pending)* **BL-19** When the backlog is empty, its entry stays on both widths: the desktop strip and the mobile pill, and the header of the panel or the sheet, show 0 (BL-8). Opened, the panel or the sheet shows a dashed box in place of the cards: a title saying everything is on deck, then two sentences, that the week's plan is all on the board and that the user can adjust the plan to add more or call it a week. It has no button or link. When the user pulls the last task while it's open, it stays open and the box takes the cards' place.

### Groups

- **BL-9** The backlog's tasks wait in groups: one habit's tasks in the backlog are one group, and one project's steps in the backlog are another. On both widths each group is one card, showing the group's next task: a habit's lowest copy, or a project's lowest step. A group with only one task is a plain card; when more tasks wait behind its next one, its card sits on a pile of them (BL-11). The groups sit in two sections, Habits and then Projects, and a section with no group in it isn't shown.
- **BL-16** Within each section, the groups are sorted by when their habit or project itself was created (a habit's own creation, not when it joined this week's plan), the oldest first; the tasks themselves play no part. Groups whose habits or projects were created at the same moment go by the habit's or the project's id.
- *(removing)* **BL-10** — replaced by CARD-9 and CARD-12. A backlog card shows, from top to bottom:
  - kind: a habit card shows its kind, and a step card its project's name; neither shows details (no Daily × N or Weekly × N, no step n/N)
  - title: the next task's title
  - description: the next task's description
  - progress: a habit's week dots, or the project's path, with the next task's dot or step ringed. No size and no count of how many are done; a screen reader reads the dots or the path as how many are done out of the total.

  How they work at each width:
  - desktop: the user drags the card out of the panel
  - mobile: the card has ↑ Todo and can't be dragged, so on mobile a backlog task reaches Done only through Todo
- **BL-11** A group with tasks behind its next one shows **+N more** on its card, N being how many are behind, and under the card one thin sheet for each of them, at most three. The sheets have no text and can't be tapped. A group's last task shows neither.
- **BL-12** A project's **+N more** has a chevron, and opens the project's queue (A8): in place of the sheets, a row for each step behind the next one, in step order, each showing its step number and title. Pressing it again closes the queue. A habit's **+N more** is text only and opens nothing. Closing the backlog (A3) closes every open queue, so the backlog always opens with its queues closed.
- **BL-13** When a group's next task leaves the backlog, the backlog changes as soon as the card is dropped or its ↑ Todo tapped, before the server answers (MV-5):
  - the group's card shows the task after it, **+N more** goes down by one, and the sheets under it go down by one once fewer than three are behind
  - a project's open queue stays open, its first row now on the card, and is gone once no step is left behind the next one
  - when the group's last task leaves, its card is gone, and its section too once no group is left in it
- *(removing)* **BL-14** — replaced by BL-18. On desktop, while the user drags a backlog card, its place in the panel holds a placeholder of the card's size, drawn like the pile's sheets and with nothing on it. Nothing else in the backlog changes until the card is dropped (BL-13): the sheets under it, the other groups, the hint and the count stay as they were. If the drag is cancelled, the card goes back into its place.
- *(pending)* **BL-18** On desktop, while the user drags a backlog card, its place in the panel holds a placeholder of the card's size, drawn like the pile's sheets and with nothing on it. Nothing else in the backlog changes until the card is dropped (BL-13): the sheets under it, the other groups and the count stay as they were. If the drag is cancelled, the card goes back into its place.

## Progress

> **As is.** The day rings (RING-1 to RING-7) replace this dashboard; the section stays as it stands, without IDs, until they are built, and the change that builds them deletes it.

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

## Motion

What plays when a card is selected, completed and counted. How each motion looks (what moves, how far, for how long) is its `fx-*` utility's, in `design/design-language/README.md` › Motion and › FX utility layer. Each ends with the layout as it is at rest, and when the system asks for reduced motion, none of them plays, apart from the one fade FX-2 keeps.

- *(pending)* **FX-1** Pressing ✓ Complete (A12) first plays a *juice* on the card where it stands: one of `fx-juice-wobble`, `fx-juice-shine`, `fx-juice-burst` and `fx-juice-flip`, picked at random each time, and never the same one twice in a row on the page. Under reduced motion no juice plays.
- *(pending)* **FX-2** Once the juice has played, the card is tossed into today's ring with `fx-toss`: a copy of the card, drawn above the board so that no column cuts it off, flies from the card's place to today's cell, and the card leaves Todo once it lands (MV-6). The cards that were below it then slide up into the space with `fx-slide`. Dragging a card onto Done tosses nothing. Under reduced motion nothing flies or slides: the card fades out where it stands with `fx-fade-out`, then leaves Todo, and the cards below it take its place at once. Left open on purpose (owner, 2026-11-19): what a press on another Todo card does while a card is in flight. Only rare use reaches it, so it has no item and no test, and the implementation does whatever is simplest.
- *(pending)* **FX-3** Whenever a day's counts change on the page, its ring's arcs grow or shrink to their new lengths with `fx-ring-grow`; when a card is finished, today's cell also gives one small jump with `fx-ring-tick`. Under reduced motion the arcs take their new lengths at once and the cell doesn't jump.
- *(pending)* **FX-4** When a task finished on the page closes today's ring (RING-3), by ✓ Complete or by a drag onto Done, today's cell celebrates with `fx-ring-close`: the ring turns once, sparks fly out of it, coloured in the same shares as today's done tasks by kind, and the ✓ draws itself in its centre. The page never plays it for a ring that is already closed when it loads. Under reduced motion it doesn't play: the ✓, the success frame and **All N done** appear at once (RING-5).
- *(pending)* **FX-5** On desktop, a card finished on the page lands at the top of Done and glows once with `fx-done-in`, then stays in Done's look (CARD-2). Only that moment glows: the card doesn't glow again when the page renders or reloads. Under reduced motion it doesn't glow.
- *(pending)* **FX-6** Selecting a card (A10) plays `fx-arm` on it: its round mark grows into the ✓ and **Complete** comes in beside it; cancelling (A11) plays it back. Under reduced motion the card takes its selected or normal look at once.
- *(pending)* **FX-7** Where the device can vibrate, pressing ✓ Complete asks for a short double pulse, and closing today's ring (FX-4), by either path, asks for a longer one. These aren't motion: they happen under reduced motion too.
- *(pending)* **FX-8** Pressing a Todo card, or a day's cell that is a button (DAY-1), shrinks it a little for as long as it is held, with `fx-press`, and it comes back when it is let go; cards in Done and the backlog, and the days after today, don't. Under reduced motion it doesn't shrink.

## Actions

| ID | Action | Where | Server action | Result |
| --- | --- | --- | --- | --- |
| A1 | Start a plan | the empty board's button | — | the plan page opens |
| A2 | Open the backlog | the strip (desktop) or the pill (mobile) | — | the panel or the sheet opens, and focus moves into it (BL-5) |
| A3 | Close the backlog | the close button of the panel or the sheet | — | it closes, and focus goes back to the strip or the pill (BL-5) |
| A4 | Pull to Todo (desktop) | drag a backlog card onto Todo | `updateTaskStatusAction` → `TODO` | the card moves (A move) |
| *(removing)* A5 | Pull to Todo (mobile) — replaced by A9 | tap ↑ Todo on a backlog card | `updateTaskStatusAction` → `TODO` | the card moves (A move), and the sheet stays open for the next one |
| *(pending)* A9 | Pull to Todo | tap ↑ Todo on a backlog card, on either width | `updateTaskStatusAction` → `TODO` | the card moves (A move), and the panel or the sheet stays open for the next one |
| A6 | Finish from the backlog | drag a backlog card onto Done (desktop) | `updateTaskStatusAction` → `DONE` | the card moves (A move) |
| *(removing)* A7 | Finish — replaced by A15; on mobile a card is finished with A12 | drag a Todo card onto Done | `updateTaskStatusAction` → `DONE` | the card moves (A move) |
| *(pending)* A15 | Finish by dragging (desktop) | drag a Todo card onto Done (desktop) | `updateTaskStatusAction` → `DONE` | the card moves (A move), and nothing is tossed (FX-2) |
| *(pending)* A10 | Select a card | press a Todo card anywhere, on either width | — | the card is selected and shows its ✓ Complete (TAP-1), and an open day's list closes (DAY-4) |
| *(pending)* A11 | Cancel the selection | press the selected card again, press outside the Todo cards, press Esc, open a day's list or open the backlog | — | the card goes back to normal, with nothing finished (TAP-2) |
| *(pending)* A12 | Complete | press ✓ Complete on the selected card, on either width | `updateTaskStatusAction` → `DONE` | the card plays its juice and is tossed into today's ring (FX-1, FX-2), then moves (A move) |
| *(pending)* A13 | Open a day's list | press today's cell or a day's cell before it, in the row of rings | — | the day's list opens, in a panel on desktop or a sheet on mobile (DAY-2), and focus moves to its close button (DAY-5) |
| *(pending)* A14 | Close a day's list | its close button, its day's cell again, anywhere outside it, or Esc | — | it closes, and focus goes back to the day's cell (DAY-5) |
| A8 | Open or close a project's queue | **+N more** with its chevron, on a project's backlog card | — | the steps behind its next one show in place of the sheets under it, or are hidden again (BL-12) |

### A move

What happens when a card moves (A4, A6, A9, A12 and A15):

- *(removing)* **MV-5** — replaced by MV-6. The card moves straight away, before the server answers: to the top of Done, or to its place in Todo (sorted as in COL-2). At the same moment:
  - the counts follow it: the column it leaves and the one it lands in change their header counts (COL-1), and a card leaving the backlog takes the backlog's count down by one (BL-8)
  - the card's progress, when it lands on Done: its dot or segment fills (CARD-7), and a screen reader reads a habit card's dots as one more done
- *(pending)* **MV-6** The card moves before the server answers: as soon as it is dropped or its ↑ Todo is tapped, and, when it is completed with ✓ Complete, as soon as it has landed in today's ring (FX-2). It goes to its place in Todo (sorted as in COL-2), or, when it is finished, to the top of Done on desktop and off the board on mobile. At the same moment:
  - the counts follow it: the column it leaves and the one it lands in change their header counts (COL-6), and a card leaving the backlog takes the backlog's count down by one (BL-8)
  - the card's progress, when it is finished: its dot or segment fills on every card that shows it (CARD-7), and a screen reader reads a habit card's dots as one more done
  - today's ring counts it (RING-2): a card pulled into Todo adds one to today's planned count; a card finished from Todo adds one to today's done count; a card finished from the backlog adds one to both
- **MV-2** The server saves the new status. Moving a card to Done records when it was finished; moving it to Todo clears that.
- *(removing)* **MV-3** — replaced by MV-7. When the server answers, the page reloads its data, and only then does the progress dashboard (Progress) count the move:
  - pulled into Todo: today's total goes up by one, since today counts every task out of the backlog
  - finished from Todo: today's done count and the week's go up by one, and today's points and the week's go up by the task's points
  - finished from the backlog: all of the above, today's total included

  A one-off moved to Done also leaves the priority matrix.
- *(pending)* **MV-7** When the server answers, the page reloads its data. The rings have counted the move already (MV-6), so the reload leaves them as they are. A one-off moved to Done also leaves the priority matrix.
- *(pending)* **MV-8** If the server refuses a move, today's ring takes back what MV-6 added for it, and a ring the move had closed opens again, with no second celebration. A card completed with ✓ Complete comes back into Todo as in MV-4.
- **MV-4** If the server refuses a move, only that card goes back to where it was. While other cards are still saving, it goes back once they have saved.

## Rules

- **R1** The server only moves a task forward: Backlog → Todo, Backlog → Done, or Todo → Done. It refuses any other move, so finished work stays counted.
- **R2** The server only moves a task that's on the plan. A one-off still on the priority matrix gets onto the board by being tracked for this week, never by a move.
- **R3** The server only moves the user's own tasks.
- **R4** On the board, a card in Done can't be dragged.
- **R5** On the board, nothing can be dropped into the backlog.
- **R6** On the board, only a group's next task can be pulled out of the backlog: the steps in a project's queue can't be dragged and have no ↑ Todo. Only the board holds this limit: the server doesn't check a task's place in its group when it moves it (R1), so a write path outside the board, such as a future Claude tool over MCP, wouldn't be held to it.
- *(pending)* **R7** On the board, a day's list is read only: nothing in it can be moved back to Todo or the backlog. The server refuses that move too (R1).

When the server refuses a move, the card goes back as in MV-4.

## Journeys

- **J1 New user**:
  - the empty board (ST-1): it asks for a first plan
  - start a plan (A1): the plan page opens
- **J2 Returning user**:
  - the empty board (ST-2): it shows last week's recap
  - start this week's plan (A1): the plan page opens
- *(removing)* **J5 A week's work - desktop** — replaced by J12. With a habit's two tasks and a project's two steps in the backlog:
  - the board (ST-3): Todo and Done are empty, and nothing is done today
  - open the backlog (A2): the panel shows two groups, the habit under Habits and the project under Projects. Each card shows its group's next task with **+1 more**, on a pile of one sheet. The count reads 4, as on the strip.
  - open the project's queue (A8): the step behind its next one shows in place of its pile
  - pull the project's next step into Todo (A4): it's in Todo; Todo's count goes up by one and the backlog's goes down by one. The project's card now shows its second step as a plain card, with no **+N more** and no queue (BL-13). Once saved, today's total goes up by one (MV-3).
  - pull the habit's next task into Todo (A4): the same, and the habit's card now shows its second task as a plain card
  - close the backlog (A3): the strip shows 2
  - finish the habit task (A7): it's on top of Done, its dot fills and a screen reader reads the habit's dots as one more done; Todo's count goes down and Done's goes up. Once saved, today's and the week's done counts and points count it.
  - reload: the step is still in Todo and the habit task in Done, and the progress is the same; the strip shows 2, and opened, the backlog holds both groups as plain cards
- *(pending)* **J12 A week's work - desktop**, with a habit's two tasks and a project's two steps in the backlog, and nothing done today:
  - the board (ST-4): Todo and Done are empty, and today's ring is an empty track that reads **0 of 0 done**
  - open the backlog (A2): the panel shows two groups, the habit under Habits and the project under Projects, with no hint under its header (BL-20). Each card shows its group's next task with **+1 more**, on a pile of one sheet. The count reads 4, as on the strip.
  - open the project's queue (A8): the step behind its next one shows in place of its pile
  - drag the project's next step onto Todo (A4): it's in Todo; Todo's count goes up by one and the backlog's goes down by one. The project's card now shows its second step as a plain card, with no **+N more** and no queue (BL-13). Today's ring reads **0 of 1 done** at once (MV-6).
  - tap ↑ Todo on the habit's card (A9): the habit's next task is in Todo, the panel stays open, the habit's card shows its second task as a plain card, and today's ring reads **0 of 2 done**
  - close the backlog (A3): the strip shows 2
  - select the habit task (A10): it shows its ✓ Complete
  - complete it (A12): it plays its juice and flies into today's ring; then it's on top of Done and glows once, its dot fills and a screen reader reads the habit's dots as one more done. Todo's count goes down and Done's goes up, and today's ring reads **1 of 2 done**, its habit arc filled.
  - open today's list (A13): it lists the habit task (DAY-3)
  - reload: the step is still in Todo and the habit task in Done, and today's ring reads **1 of 2 done**; the strip shows 2, and opened, the backlog holds both groups as plain cards
- *(removing)* **J6 A week's work - mobile** — replaced by J13. J5 on a phone, with the same data and the same steps, except:
  - open the backlog (A2): the pill opens the sheet
  - pull each task (A5): tap ↑ Todo on its card in place of dragging it, and the sheet stays open for the next
  - close the backlog (A3): the pill shows 2, and the board behind the sheet can be reached again
- *(pending)* **J13 A week's work - mobile**: J12 on a phone, with the same data and the same steps, except:
  - open the backlog (A2): the pill opens the sheet
  - pull the project's next step (A9): tap ↑ Todo on its card in place of dragging it, and the sheet stays open for the next
  - close the backlog (A3): the pill shows 2, and the board behind the sheet can be reached again
  - complete the habit task (A12): it flies into today's ring and leaves Todo; the board has no Done, and today's ring reads **1 of 2 done**
  - open today's list (A13): the list opens in a sheet
  - reload: the habit task is in today's list, not on the board
- *(removing)* **J11 Finish from the backlog - desktop-only** — replaced by J14. With a habit's two tasks in the backlog:
  - the board (ST-3): Todo and Done are empty, and nothing is done today
  - open the backlog (A2): the habit's card shows **+1 more**, on a pile of one sheet
  - drag the habit's next task onto Done (A6): it's on top of Done, its dot fills and a screen reader reads the habit's dots as one more done; Done's count goes up and the backlog's goes down, and the habit's card shows its second task as a plain card. Once saved, today's done count, total and points, and the week's done count and points, all count it (MV-3).
  - reload: the task is still in Done, and the progress is the same
- *(pending)* **J14 Finish from the backlog - desktop-only**, with a habit's two tasks in the backlog, Todo empty and nothing done today:
  - the board (ST-4): Todo and Done are empty, and today's ring reads **0 of 0 done**
  - open the backlog (A2): the habit's card shows **+1 more**, on a pile of one sheet
  - drag the habit's next task onto Done (A6): nothing is tossed (FX-2). It's on top of Done, its dot fills and a screen reader reads the habit's dots as one more done; Done's count goes up and the backlog's goes down, and the habit's card shows its second task as a plain card. Today's ring counts it as planned and done at once and closes: it celebrates (FX-4) and reads **All 1 done** (RING-5), and Todo shows that the day is clear (COL-8).
  - reload: the task is still in Done, and today's ring is still closed, with no celebration
- *(removing)* **J7 Wrap up the day - desktop** — replaced by J15. With a habit task and a project step in Todo, the backlog holding more, and nothing done today:
  - the board (ST-3): Todo shows the two cards and Done is empty
  - finish the habit task (A7): it's on top of Done and its dot fills; the step is still in Todo
  - finish the step (A7): it's on top of Done and its segment fills, and the empty Todo shows that the day is clear (COL-5)
  - reload: Todo still shows that the day is clear, and Done holds both tasks
- *(pending)* **J15 Wrap up the day - desktop**, with a habit task and a project step in Todo, the backlog holding more, and nothing done today:
  - the board (ST-4): Todo shows the two cards, Done is empty, and today's ring reads **0 of 2 done**
  - select the habit task (A10), then the step (A10): the selection moves to the step, and the habit task is back to normal
  - press the step again, away from its ✓ Complete (A11): it's back to normal, and nothing is finished
  - select the habit task and complete it (A10, A12): it flies into today's ring; it's on top of Done and its dot fills; the step is still in Todo, and today's ring reads **1 of 2 done**
  - select the step and complete it (A10, A12): it flies into today's ring; it's on top of Done and its segment fills. Today's ring closes and celebrates (FX-4): it reads **All 2 done**, holds the ✓ and its frame turns to the success colour (RING-5), and the empty Todo shows that the day is clear (COL-8).
  - reload: today's ring is still closed, with no celebration; Todo still shows that the day is clear, and Done holds both tasks
- *(removing)* **J8 Wrap up the day - mobile** — replaced by J16. J7 on a phone, with the same data and the same steps; the box shows in Todo's row (COL-4).
- *(pending)* **J16 Wrap up the day - mobile**: J15 on a phone, with the same data and the same steps, except that each completed card leaves the board rather than landing on Done (COL-6), the box shows in Todo's list (COL-7), and after the reload both tasks are in today's list.
- *(pending)* **J17 Look back at a day - desktop**, on a Wednesday, with a habit that runs twice a day: both of Monday's habit tasks and a one-off done on Monday, one of Tuesday's two habit tasks done and the other expired, Todo empty, and nothing done today:
  - the board (ST-4): Monday's ring is closed, with its ✓; Tuesday's ring is half filled; the rings from Thursday to Sunday are empty tracks and aren't buttons (RING-7)
  - open Monday's list (A13): it floats under the row, below Monday's cell. Its header reads Mon and **3 of 3 done**, and its rows are the two habit tasks and then the one-off (DAY-3).
  - open Tuesday's list (A13): Monday's list closes, and Tuesday's reads **1 of 2 done**, with one habit task's row
  - press Tuesday's cell again (A14): the list closes
  - open today's list (A13): its header reads Today and **0 of 0 done**, and the list shows **Nothing yet**
  - press Esc (A14): the list closes, and focus is back on today's cell
- *(pending)* **J18 Look back at a day - mobile**: J17 on a 390 px phone, with the same data and the same steps, except:
  - the board (ST-4): the row shows Monday to Thursday, today and the two days before it, with Thursday filling the rest (RING-1)
  - each list opens in a sheet from the bottom, with the board dimmed behind it (DAY-2)
  - press outside the sheet, on the dimmed board, in place of Esc (A14): the sheet closes
- *(removing)* **J9 Clear the backlog - desktop** — replaced by J19. With a habit's two tasks in the backlog:
  - the board (ST-3): the strip shows 2
  - open the backlog (A2): the habit's card shows **+1 more**, on a pile of one sheet, and the count reads 2
  - pull its next task into Todo (A4): the habit's card shows its second task as a plain card, and the count reads 1
  - lift the last card (BL-14): its place holds an empty placeholder, and the hint and the count of 1 stay
  - drop it on Todo (A4): the panel shows that everything is on deck, with no hint, and the count reads 0 (BL-15)
  - close the backlog (A3): the strip stays and shows 0
  - open it again (A2): the panel shows that everything is on deck again
- *(pending)* **J19 Clear the backlog - desktop**, with a habit's two tasks in the backlog:
  - the board (ST-4): the strip shows 2
  - open the backlog (A2): the habit's card shows **+1 more**, on a pile of one sheet, and the count reads 2
  - tap ↑ Todo on its card (A9): the habit's card shows its second task as a plain card, the panel stays open, and the count reads 1
  - lift the last card (BL-18): its place holds an empty placeholder, and the count of 1 stays
  - drop it on Todo (A4): the panel shows that everything is on deck, and the count reads 0 (BL-19)
  - close the backlog (A3): the strip stays and shows 0
  - open it again (A2): the panel shows that everything is on deck again
- *(removing)* **J10 Clear the backlog - mobile** — replaced by J20. J9 on a phone, with the same data and the same steps, except:
  - open the backlog (A2): the pill opens the sheet
  - pull each task (A5): tap ↑ Todo on its card in place of the drag, so there is no lift step. After the first tap the count reads 1. After the second, the sheet stays open and shows that everything is on deck, with no hint, and the count reads 0 (BL-15).
  - close the backlog (A3): the pill stays and shows 0
- *(pending)* **J20 Clear the backlog - mobile**: J19 on a phone, with the same data and the same steps, except:
  - open the backlog (A2): the pill opens the sheet
  - pull each task (A9): tap ↑ Todo on its card in place of the drag, so there is no lift step. After the first tap the count reads 1. After the second, the sheet stays open and shows that everything is on deck, and the count reads 0 (BL-19).
  - close the backlog (A3): the pill stays and shows 0
