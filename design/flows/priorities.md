# Priorities Flows

Flows for the priority matrix page (`/kanban/priorities`) — Eisenhower-matrix organization of Ad-hoc tasks, tracking them into the current week's plan or completing them in place. Sibling docs: `design/flows/board.md`, `design/flows/plan.md`, `design/flows/shared.md`, `design/flows/auth.md`.

> **Doc convention:** One flow per `##` heading, separated by `---`. Every flow has two required `###` sections — `Trigger / Entry Point` and `Steps` — plus an optional `### Rules` section for constraints and invariants. Extra `###` sections (e.g. `Metrics`) are allowed only for reference material that fits neither Steps nor Rules.

---

## Priorities Landing Flow

### Trigger / Entry Point

User navigates to `/kanban/priorities` via the "Priorities" sidebar item (desktop) or the "Priorities" dock tab (mobile).

### Steps

1. Fetch all of the user's Ad-hoc tasks with `status !== DONE` (both unassigned and tracked).
2. Group tasks by `quadrant` and render the 2×2 matrix (Do First / Schedule / Squeeze In / Maybe Later) with per-quadrant counts.
3. Render the title bar summary: total count and "tracking this week" count.

### Rules

- DONE Ad-hoc tasks never show on the matrix.
- A task counts as **tracked this week** only when its `planId` equals the current `ACTIVE` plan's id: it renders dimmed with a "This Week" tag (mobile: ★), and its Move-to chooser offers Done only. Tasks still pointing at a `PENDING_UPDATE` plan (period ended) render as normal cards.
- **Stale-plan guard:** an `ACTIVE` plan whose `periodKey` differs from the current ISO week is treated as no active plan, and the matrix runs the same End of Period Sync as the board (`ACTIVE → PENDING_UPDATE`; see `design/flows/shared.md`). Without the sync, the no-plan hint's "Create Plan" CTA would dead-end — plan creation rejects while a stale plan is still `ACTIVE`.

---

## Reprioritize (Drag and Drop) Flow

### Trigger / Entry Point

User drags a card to a different quadrant (desktop and mobile).

### Steps

1. UI updates optimistically.
2. Server Action persists the new quadrant to DB.
3. On failure, UI rolls back to previous state.

### Rules

- Cards move freely between all four quadrants — no ordering restriction.
- Tracked ("This Week") cards are draggable too: dragging only changes `quadrant`, never `status`/`planId`.

---

## Track This Week Flow

### Trigger / Entry Point

- **Desktop:** hover a card → click the "→" send button on its right edge → the "Move to" popover offers the target kanban columns ("Todo" / "In Progress") and, under a hairline, "Done" (see the Complete One-off Flow).
- **Mobile:** tap a card → a bottom sheet shows the card summary and the same rows.

### Steps

1. User picks the target column (Todo or In Progress).
2. UI updates optimistically: the card dims, the "This Week" tag appears, the send button hides, and the "tracking this week" count increments.
3. Server Action associates the task with the current `ACTIVE` plan and changes its status `BACKLOG → TODO` (Todo) or `BACKLOG → DOING` (In Progress); rollback on failure.
4. Revalidate `/kanban` so the board renders the card in the chosen column.

### Rules

- Requires an `ACTIVE` plan (current-week per the stale-plan guard, enforced server-side too). When none exists (period ended, next plan not yet created), the chooser still opens on both breakpoints — the two column rows render disabled under a "No active plan yet" note while Done stays enabled — and the matrix hint bar shows a "No active plan — Create Plan to track tasks this week · you can still mark tasks done" notice on **both** breakpoints (the instruction variant of the bar stays desktop-only — this warning is the only case where mobile renders the bar, and its Create Plan link is mobile's only in-page path to plan creation).
- Already-tracked cards cannot be sent again: their chooser drops the column rows and offers Done only.
- There is no untrack from the matrix — detaching happens via the Update Plan flow's ad-hoc deselection (`planId = null`, status back to `BACKLOG`; see `design/flows/plan.md`).

---

## Complete One-off Flow

### Trigger / Entry Point

Choose **Done** in a matrix card's Move-to popover (desktop, via the hover "→") or Move-to sheet (mobile, tap the card) — both breakpoints, with or without an active plan, tracked cards included.

### Steps

1. UI closes the chooser, removes the card optimistically, the title-bar counts update, and a 5 s "Marked done" toast with an **Undo** button and a draining countdown bar appears (desktop: bottom-center; mobile: above the dock) — "· +N pts this week" when an active plan absorbed the points. Hovering the toast holds the clock.
2. Server Action completes the task: `status = DONE`, `doneAt = now`; an unassigned task is attached to the current-week `ACTIVE` plan when one exists. Rollback on failure (toast withdrawn).
3. **Undo** (within the window) waits for the completion write to land, then restores the pre-complete snapshot — `status` back to `BACKLOG` / `TODO` / `DOING`, `doneAt` cleared, the plan link detached only if the complete attached it — and the card returns to its former position.
4. Revalidate `/kanban` (Done column, Today / Week metrics) and `/kanban/priorities`.

### Rules

- Works without an active plan — that is the point of the flow; the no-plan hint bar says so. Without a plan the task keeps `planId = null` and its points are credited nowhere.
- `planId` is only ever added (`null → active plan`), never re-attributed: an already-tracked card keeps its plan link. DONE tasks never return to the matrix except via Undo.
- Tracked cards complete exactly like a board drag to Done — same Done column, same Today / Week credit.
- No confirm; Undo is the only reverse path (a client can only ever detach a plan link, never attach one), and there is no "un-complete" on the board (Done cards are drag-locked). A second completion replaces the toast — the first task's undo window ends.

---

## Add Priority Task Flow

### Trigger / Entry Point

- **Desktop:** user clicks the "Add" button at the bottom of a quadrant, which opens the Ad-hoc task modal with that quadrant preset.
- **Mobile:** the per-quadrant Add buttons are hidden; a round "+" button appended to the My Priorities title bar opens the same modal as a bottom sheet with a 2×2 quadrant picker (mirroring the matrix layout, defaulting to Schedule).

### Steps

1. User fills in title, description, size — and on mobile picks a quadrant — then clicks "Add to matrix".
2. Generate the Ad-hoc task with `quadrant` matching the source quadrant (desktop) or the picked one (mobile), `status = BACKLOG`, and `planId = null`.
3. UI state updates on success; the mobile picker flow confirms with a transient "Added to {quadrant}" toast (desktop shows the new card in its quadrant instead).

### Rules

- Reuses the existing Ad-hoc task creation modal; only the submit wiring differs (quadrant + unassigned, instead of column status + plan link). The quadrant picker renders only when no source quadrant is preset.
- Tasks created here reach the board only via the "Track This Week Flow".
