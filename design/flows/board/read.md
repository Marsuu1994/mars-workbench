# Board · Read

What the board page (`/kanban`) reads, and what each part of the page derives from it.

## Source

Entering `/kanban` syncs first (`flows/shared.md`), then reads this week's `ACTIVE` plan once. No `ACTIVE` plan → the empty board. Otherwise one read returns four things, and everything below derives from them; nothing is read again until a write lands and the page's data reloads.

- **plan** — its week, its mode (`NORMAL` / `EXTREME`), its habit templates and their frequencies
- **tasks** — every task on the plan but `EXPIRED`: habit instances, the project steps scheduled this week, the one-offs tracked onto it
- **projects** — the projects behind those steps, each with its whole path
- **progress** — the counts and point sums below, computed on the server

## Progress

The server counts; the client turns the counts into percentages and the daily average. The numbers change when a move lands, not optimistically: a card dragged to Done moves at once, its counts follow when the write returns.

| Metric | Done | Out of | Test |
| --- | --- | --- | --- |
| Today | tasks done today (Los Angeles day) | tasks on the board: not `BACKLOG` | `boardService.int` › counts today's and the week's progress; › doesn't count yesterday evening's work as today's |
| Today points | their points | the board's points | same |
| Week | tasks done on the plan | projected: daily tasks before today (done or not) + the daily templates × days left + weekly instances + one-offs + steps, backlog included | › counts today's and the week's progress |
| Week points | their points | the same projection in points | same |
| Daily avg | the week's done points ÷ days since Monday (1–7), one decimal | — | none |

- Days left: `NORMAL` counts the weekdays from today to Sunday, `EXTREME` every day left (at least 1).
- A percentage is done ÷ out of, rounded; 0 when there is nothing to do — no test.
- Today's daily tasks count once, in the projection, never also as "before today".
