# Priorities

The `/kanban/priorities` page: a full-page 2×2 Eisenhower priority matrix for one-off (AD_HOC) tasks. See [design/baseline.md](../../../design/baseline.md) for the app-wide design baseline and [design/flows/priorities.md](../../../design/flows/priorities.md) for flow docs.

## Current State

- **Matrix page**: full-page 2×2 Eisenhower matrix at `/kanban/priorities` (sidebar item + mobile dock tab) organizing all non-DONE AD_HOC tasks by `quadrant` (`PriorityQuadrant` enum: `DO_FIRST / SCHEDULE / SQUEEZE_IN / MAYBE_LATER`, backfilled to `SCHEDULE`); null-quadrant cards defensively group into `SCHEDULE`
- **Reprioritize**: drag between quadrants (tracked cards too — only `quadrant` changes) with optimistic update + rollback and full drag visuals (dimmed quadrants, drop-target outline, per-quadrant drop-hint banner)
- **Track This Week**: hover send `→` → popover (desktop) or tap card → bottom sheet (mobile) pulls a matrix task onto the board into Todo/In Progress (`BACKLOG → TODO/DOING` + plan link, one write); tracked cards render dimmed with a "This Week" tag (★ on mobile)
- **Add Priority Task**: quadrant "Add" buttons open the shared task modal to create unassigned matrix tasks (`planId = null`, `BACKLOG`); the matrix is the only ad-hoc entry point (board-side creation removed). Deselecting an ad-hoc task from a plan returns it to the matrix pool, while DONE tasks stay on their plan to preserve point history
- **"Todo" badge**: AD_HOC tasks display a blue "Todo" type badge (board cards included)
- **No-plan guard**: no active plan (incl. the stale-ACTIVE-plan window after ISO week rollover, guarded server-side in `matrixService`) → warn hint bar + disabled send/sheet buttons

Open items: see [design/tracker.md](../../../design/tracker.md).

## Update Log

### 2026-07-03
- Split from the kanban feature; prior history lives in [board/README.md](../board/README.md).
