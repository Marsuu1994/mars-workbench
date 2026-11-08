# Board · Read

What the board page (`/kanban`) reads, and what each part of the page derives from it.

## Source

Entering `/kanban` syncs first (`flows/shared.md`); a plan whose week has ended moves from `ACTIVE` to `PENDING_UPDATE` there. The page is then in one of three states, by the plans the user has.

### New user — no plan

No `ACTIVE` plan and none waiting to close. Nothing more is read: the empty board asks for a first plan.

### Returning user — last week's plan waiting to close

No `ACTIVE` plan, but a `PENDING_UPDATE` one. One more read: last week's recap, over that plan's habit instances.

- **completion rate** — the done ones ÷ all of them, expired included
- **tasks done** — done / all
- **points earned** — the done ones' points

Tests: `boardService.int` › getEmptyBoardState › greets a new user; › recaps a returning user's finished week.

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

Two columns of the same card: a task sits in Todo while `TODO` and in Done once `DONE`; `BACKLOG` tasks are the backlog's, `EXPIRED` ones aren't shown. Each column's header counts its cards.

Test: `boardCardUtils` › groups cards by status and skips EXPIRED.

### Order

Daily habits first, then everything else. A group — one habit's instances, or one project's steps — stays together: groups rank by their earliest `createdAt` and run in instance order (copy number, step number); a one-off ranks by its own `createdAt`. Ties go to `createdAt`, then id.

Tests: `taskUtils` › sortTasks › puts DAILY first, keeps groups together and orders them by number; › breaks ties by createdAt, then id.

### Cards

Every card shows its kind (a step names its project instead), its title and description, its size, and its kind's context and progress mark. A Done card is the same card, settled: dimmed, its title struck through, its description hidden.

- **Habit** — its plan line (Daily × N, Weekly × N) and its week dots, one per instance the line generates this week, in order: a weekly line one per instance; a daily line its frequency on every generating day (weekdays in `NORMAL`, every day in `EXTREME`), so a plan started mid-week still shows the whole week. A dot fills when its instance is done, and the card's own dot is ringed. A done instance past a frequency cut keeps its dot; an instance outside the line (a mode switch, a cut) has none. No done / target count: the dots are the progress.
  Tests: `taskUtils` › computeHabitWeeks › gives a daily line a dot for every weekday of a NORMAL week; › counts every day of an EXTREME week; › gives a weekly line one dot per instance; › keeps a DONE instance past a frequency cut; › leaves a daily instance past the frequency without a dot; › gives a template with no instances an empty line. `boardCardUtils` › gives a habit card its plan line and its own dot.
- **Project step** — step n of N and its project's path, one mark per step: filled when done, this step's ringed. The path reads the board's latest statuses, so a step dragged to Done fills its mark at once; a step whose project isn't loaded shows no path.
  Tests: `boardCardUtils` › draws a step's path from the board's latest statuses; › leaves a step without context when its project is not in the lookup. `boardService.int` › draws each step card's whole path, for this week's projects only.
- **One-off** — its quadrant.
  Test: `boardCardUtils` › gives a one-off card nothing but the task.
