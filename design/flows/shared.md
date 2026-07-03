# Shared Flows

Cross-page sync lifecycle flows — the daily and end-of-period syncs and the `ensureSynced` entry point (`src/lib/kanban/syncService.ts`) consumed by the board (`design/flows/board.md`), the priority matrix (`design/flows/priorities.md`), and the plan pages (`design/flows/plan.md`).

> **Doc convention:** One flow per `##` heading, separated by `---`. Every flow has two required `###` sections — `Trigger / Entry Point` and `Steps` — plus an optional `### Rules` section for constraints and invariants. Extra `###` sections (e.g. `Metrics`) are allowed only for reference material that fits neither Steps nor Rules.

---

## Daily Sync Flow

### Trigger / Entry Point

`lastSyncDate` is earlier than today.

### Steps

1. Set `lastSyncDate = today` first to prevent concurrent re-runs.
2. Expire all daily tasks where `forDate` is **strictly before yesterday** (i.e., `forDate < today - 1 day`) and status is not DONE.
3. If today is a weekend day and plan mode is NORMAL, skip daily task generation.
4. Otherwise, generate new daily task instances for today **with `status = BACKLOG`** (staged in the backlog drawer; the user pulls them onto the board — see the "Backlog Drawer Flow" in `design/flows/board.md`).

### Rules

- Idempotent — safe to re-run multiple times.
- Plan creation and template updates also set `lastSyncDate` to avoid redundant sync on next page load.
- **1-day rollover buffer:** tasks from yesterday are NOT expired on today's sync — they carry over and remain on the board for one extra day. They expire on the following day's sync.
- A task is considered **rolled over** when `task.type === DAILY && task.forDate < today`. This is computed in-memory; no schema change required.
- Rolled-over tasks are sorted after today's fresh daily tasks (but before weekly tasks) within each column.
- Rolled-over tasks display a distinct visual treatment on the task card to signal they are from a previous day (see `design/mockup/board/mockup-board.html`).
- During weekends, daily task generation is skipped unless plan mode is EXTREME.
- Week projection formula adjusts for mode: NORMAL counts only remaining weekdays, EXTREME counts all remaining calendar days.

---

## End of Period Sync Flow

### Trigger / Entry Point

Current ISO week key differs from `plan.periodKey`.

### Steps

1. Expire all remaining non-DONE tasks instances except Ad-hoc tasks.
2. Set plan status: `ACTIVE` → `PENDING_UPDATE`.
3. Return null → board renders "Create Plan" prompt.

---

## Ensure Synced Flow

### Trigger / Entry Point

Every kanban page awaits `ensureSynced(userId)` (`src/lib/kanban/syncService.ts`) server-side before reading plan state: `boardService.fetchBoard` (board), `matrixService` (matrix fetch + track), and both plan pages (`/kanban/plans/new`, `/kanban/plans/[id]`).

### Steps

1. Fetch the user's `ACTIVE` plan. If none exists, return `null` → the caller renders its no-plan state.
2. If the plan's `periodKey` is not the current ISO week, run the End of Period Sync (above) and return `null` — no active plan anymore.
3. If `plan.lastSyncDate` differs from today, run the Daily Sync (above).
4. Return the current-week `ACTIVE` plan.

### Rules

- Single entry point for the sync lifecycle: no page carries its own sync branching, and no "which page did the user visit first?" ordering matters.
- Idempotent — the daily sync runs at most once per day via the `Plan.lastSyncDate` short-circuit.
- Wrapped in React `cache()`, so concurrent calls within one server render pass (e.g. a page and a nested component) dedupe to a single run. Server Actions run in their own request, so mutations re-check fresh state.
- `runDailySync` / `runEndOfPeriodSync` remain standalone exports for a future cron-driven sync (see Planned: Future in `design/baseline.md`); `ensureSynced` stays as the idempotent page-load fallback.
