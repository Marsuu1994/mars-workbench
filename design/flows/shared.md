# Shared Flows

Cross-page sync lifecycle, centralized in `syncService` (`src/services/syncService.ts`). Everything that depends on the active plan — the board (`design/flows/board.md`), priorities matrix (`design/flows/priorities.md`), plan create/edit (`design/flows/plan.md`) and Projects (`design/flows/projects.md`) pages, their writes, the MCP planning tools — and the root layout (the sidebar and dock's Board / Plan state) await `ensureSynced` before reading plan state, so no caller carries its own sync branching and page-visit order never matters.

---

## Ensure Synced Flow

### Trigger / Entry Point

Awaited first by every read or write that depends on the active plan — a page's data fetch, a write that puts work on the week, an MCP planning tool. The root layout awaits it too, for the sidebar and dock's Board / Plan state, so they never point at a week that has ended. Single implementation: `syncService.ensureSynced(userId)`; a new caller that reads or writes the active plan awaits it.

### Steps

1. Fetch the `ACTIVE` plan. If none exists → return null (caller renders its no-plan state).
2. If current ISO week key differs from `plan.periodKey` → run End of Period Sync → return null.
3. If `plan.lastSyncDate` is earlier than today → run Daily Sync.
4. Return the current-week `ACTIVE` plan.

### Rules

- Idempotent — safe to call from every page on every load.
- Wrapped in React `cache()`: concurrent calls within one server render pass (the root layout and the page) dedupe to a single run. Server Actions run in their own request, so mutations re-check fresh state.
- This is what makes a matrix-first or plan-page-first landing after week rollover behave exactly like a board landing (e.g. the no-plan "Create Plan" CTA never dead-ends on a stale `ACTIVE` plan).
- `runDailySync` / `runEndOfPeriodSync` remain standalone functions — the long-term home is a scheduled cron job just after midnight in `KANBAN_TZ`, with `ensureSynced` kept as the idempotent page-side fallback (see the Cron-driven sync item in `design/tracker.md`).

---

## Daily Sync Flow

### Trigger / Entry Point

`lastSyncDate` is earlier than today (checked by Ensure Synced).

### Steps

1. Expire all daily tasks where `forDate` is **before today** and status is not DONE.
2. If today is a weekend day and plan mode is NORMAL, skip daily task generation.
3. Otherwise, generate new daily task instances for today **with `status = BACKLOG`** (staged in the backlog; the user pulls them onto the board — see the "Backlog Flow" in `design/flows/board.md`).
4. Set `lastSyncDate = today`. Steps 1–4 commit in one transaction.

### Rules

- Idempotent — safe to re-run, even concurrently. `lastSyncDate` doesn't stop two requests that both read it stale from syncing at once; the unique key on a daily instance (plan, template, `forDate`, `instanceIndex`) does: the second run's inserts are skipped as duplicates, and expiring again changes nothing.
- Plan creation and template updates also set `lastSyncDate` to avoid redundant sync on next page load.
- A missed day's unfinished daily tasks expire with the day: they leave the board, and their dot in the habit's week stays empty.
- During weekends, daily task generation is skipped unless plan mode is EXTREME.
- Week projection formula adjusts for mode: NORMAL counts only remaining weekdays, EXTREME counts all remaining calendar days.

---

## End of Period Sync Flow

### Trigger / Entry Point

Current ISO week key differs from `plan.periodKey` (checked by Ensure Synced).

### Steps

1. Expire all remaining non-DONE template instances; one-offs (`AD_HOC`) and project steps (`PROJECT`) never expire.
2. Set plan status: `ACTIVE` → `PENDING_UPDATE`.
3. Return null → the calling page renders its no-plan state (board: the empty board, see "Landing Flow" in `design/flows/board.md`; matrix: warn hint bar + disabled send).

### Rules

- One-offs and project steps left unfinished stay on the `PENDING_UPDATE` plan. The next plan either carries them over or returns them: a one-off to the priority matrix, a step to its project at the same place.
