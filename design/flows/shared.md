# Shared Flows

Cross-page sync lifecycle, centralized in `syncService` (`src/services/syncService.ts`). Every kanban page — board (`design/flows/board.md`), priorities matrix (`design/flows/priorities.md`), plan create/edit (`design/flows/plan.md`) — awaits `ensureSynced` before reading plan state, so no page carries its own sync branching and page-visit order never matters.

> **Doc convention:** One flow per `##` heading, separated by `---`. Every flow has two required `###` sections — `Trigger / Entry Point` and `Steps` — plus an optional `### Rules` section for constraints and invariants. Extra `###` sections (e.g. `Metrics`) are allowed only for reference material that fits neither Steps nor Rules.

---

## Ensure Synced Flow

### Trigger / Entry Point

Awaited by every kanban page's data fetch before reading plan state: board (`fetchBoard`, first line), priorities (`fetchPriorityMatrix` and `trackTaskThisWeek`), and the plan create/edit pages (top of the page loaders). Single implementation: `syncService.ensureSynced(userId)`.

### Steps

1. Fetch the `ACTIVE` plan. If none exists → return null (caller renders its no-plan state).
2. If current ISO week key differs from `plan.periodKey` → run End of Period Sync → return null.
3. If `plan.lastSyncDate` is earlier than today → run Daily Sync.
4. Return the current-week `ACTIVE` plan.

### Rules

- Idempotent — safe to call from every page on every load.
- Wrapped in React `cache()`: concurrent calls within one server render pass dedupe to a single run. Server Actions run in their own request, so mutations re-check fresh state.
- This is what makes a matrix-first or plan-page-first landing after week rollover behave exactly like a board landing (e.g. the no-plan "Create Plan" CTA never dead-ends on a stale `ACTIVE` plan).
- `runDailySync` / `runEndOfPeriodSync` remain standalone functions — the long-term home is a scheduled cron job just after midnight in `KANBAN_TZ`, with `ensureSynced` kept as the idempotent page-side fallback (see the Cron-driven sync item in `design/tracker.md`).

---

## Daily Sync Flow

### Trigger / Entry Point

`lastSyncDate` is earlier than today (checked by Ensure Synced).

### Steps

1. Set `lastSyncDate = today` first to prevent concurrent re-runs.
2. Expire all daily tasks where `forDate` is **strictly before yesterday** (i.e., `forDate < today - 1 day`) and status is not DONE.
3. If today is a weekend day and plan mode is NORMAL, skip daily task generation.
4. Otherwise, generate new daily task instances for today **with `status = BACKLOG`** (staged in the backlog; the user pulls them onto the board — see the "Backlog Flow" in `design/flows/board.md`).

### Rules

- Idempotent — safe to re-run multiple times.
- Plan creation and template updates also set `lastSyncDate` to avoid redundant sync on next page load.
- **1-day rollover buffer:** tasks from yesterday are NOT expired on today's sync — they carry over and remain on the board for one extra day. They expire on the following day's sync.
- A task is considered **rolled over** when `task.type === DAILY && task.forDate < today`. This is computed in-memory; no schema change required.
- Rolled-over tasks are sorted after today's fresh daily tasks (but before weekly tasks) within each column.
- Rolled-over tasks display a distinct visual treatment on the task card to signal they are from a previous day (see the TaskCard states in the `/design` gallery and `/design/scenarios/board`).
- During weekends, daily task generation is skipped unless plan mode is EXTREME.
- Week projection formula adjusts for mode: NORMAL counts only remaining weekdays, EXTREME counts all remaining calendar days.

---

## End of Period Sync Flow

### Trigger / Entry Point

Current ISO week key differs from `plan.periodKey` (checked by Ensure Synced).

### Steps

1. Expire all remaining non-DONE tasks instances except one-off (`AD_HOC`) tasks.
2. Set plan status: `ACTIVE` → `PENDING_UPDATE`.
3. Return null → the calling page renders its no-plan state (board: "Create Plan" prompt; matrix: warn hint bar + disabled send).
