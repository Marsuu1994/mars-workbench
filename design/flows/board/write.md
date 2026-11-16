# Board · Write

What the board page (`/kanban`) writes: each change the user makes to the server's state, from the control to what the page shows once it lands. What the page shows before any write is in `read.md`.

The board has one write, a move: a card's status goes forward. Opening the backlog and expanding a project change nothing on the server (Read › Backlog › Open and expand).

## Move

A card moves forward, one status at a time or straight to Done:

| From | To | How |
| --- | --- | --- |
| Backlog | Todo | drag onto Todo (desktop) · ↑ Todo (mobile) — the pull |
| Backlog | Done | drag onto Done (desktop) |
| Todo | Done | drag onto Done |

Nothing moves back. The board doesn't offer it — a Done card has no drag handle, and the backlog takes no drops — and the server refuses it.

### What happens

1. **At once, on the client** — the card is in its new place: on top of Done, or in Todo by its kind (Read › Columns › Order). A habit's dot or a step's segment fills when it lands on Done.
2. **The server** saves the status. A move to Done stamps when it was done; a move to Todo clears it.
3. **Once it lands** the page's data reloads: the progress counts it (progress waits for this — it never moves before the server answers). A one-off moved to Done leaves the priority matrix too.
4. **If it fails**, only that card goes back where it was; other moves in flight stay.

### Rules

- **Forward only**: Backlog → Todo, Backlog → Done, Todo → Done; nothing leaves Done, so what was done stays counted.
- **Only a task on the plan moves**: a one-off still on the priority matrix reaches the board through Track This Week, never through a move.
- **Only the user's own task.**

A refused move fails like any other (step 4).

Tested in `tasks.int.test.ts` › updateTaskStatus.

## Pull

> **Designed, not built yet** — mockup `design/mockup/mockup-board-backlog-grouping.html`. Today any backlog card can be pulled.

A pull is a move out of the backlog (Backlog → Todo, or → Done on desktop), and it always takes the group's next task: a habit's earliest instance, a project's lowest step. The card the user drags or taps is the group's card, so there is no other to pick.

Once it lands, the group shows the one behind it: the pile loses a sheet, +N more counts one fewer, an open queue moves up; the last one pulled takes the group away. The backlog's count drops at once.

（有一个ux我想make sure的就是，当drag and drop a group with more than one item的时候，用户拿起卡片的时候，这个时候backlog里面的后一张露出来）

## Journeys (e2e)

One test per journey, each step a `test.step` named after the row it walks:

- **A week's work** — open the backlog, pull a habit's next instance to Todo, drag it to Done; it stays done after a reload and today's progress counts it. （我觉得可以做一个更完整的e2e，模拟用户习惯，打开backlog，看任务，点开project pile，然后pull到todo，正好可以测试我想要make sure的behavior，然后还可以拿habit测试一个直接move到done，这样我们还能测试dot的behavior和backlog到done这个flow）
- **What the board won't do** — a Done card is not a drag handle; the backlog is not a drop target.
