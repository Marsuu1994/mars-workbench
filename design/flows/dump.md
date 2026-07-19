# Dump Flows

Flows for the dump page (`/kanban/dump`) — friction-free brain dump of whatever is in your head (noise, negatives, ideas): type, dump, move on. Deliberately storage-only in V1 — no tags, no categories, no LLM. Sibling docs: `design/flows/board.md`, `design/flows/plan.md`, `design/flows/priorities.md`, `design/flows/shared.md`, `design/flows/auth.md`.

> **Status: shipped (V1).** Screen-level source of truth: the Dump scenarios at `/design/scenarios/dump` (populated feed + empty state). Schema in `design/baseline.md` (DumpEntry). Backend/UI reference rows in `design/reference.md`.

> **Doc convention:** One flow per `##` heading, separated by `---`. Every flow has two required `###` sections — `Trigger / Entry Point` and `Steps` — plus an optional `### Rules` section for constraints and invariants. Extra `###` sections are allowed only for reference material that fits neither Steps nor Rules.

---

## Dump Landing Flow (View)

### Trigger / Entry Point

User navigates to `/kanban/dump` via the "Dump" sidebar item (desktop) or the "Dump" dock tab (mobile — the dock grows to 5 tabs: Board · Priorities · Plan · Dump · Settings).

### Steps

1. Await `syncService.ensureSynced` like every kanban page (dump itself is plan-independent; the shared header still shows the current week).
2. Fetch the first feed page (newest `DUMP_PAGE_SIZE = 20` entries).
3. Render, top to bottom: capture composer (auto-focused on desktop), feed grouped by day (Today / Yesterday / weekday + date), newest first.
4. Infinite scroll: an IntersectionObserver sentinel near the feed bottom loads the next page by cursor and appends it (skeleton cards while in flight). At the end of history the sentinel is removed.

### Rules

- Feed order is `createdAt DESC, id DESC`; the cursor is the `(createdAt, id)` of the last row so pagination is stable while new entries are captured.
- Day grouping and "Today"/"Yesterday" labels use the `KANBAN_TZ` anchor (same as `dateUtils`).
- Entries longer than 6 rendered lines clamp with a "Show more" toggle (client-only).
- Empty state (no entries at all): composer stays; feed area shows the "Nothing here yet" empty state.
- `isProcessed` is never surfaced in the UI — it is a dormant flag reserved for a future LLM batch-processing flow (see tracker).
- State lives in a `dumpStore` (Zustand): loaded pages + paging cursor; hooks bridge to server actions per the store conventions.

---

## Quick Capture Flow

### Trigger / Entry Point

User types into the composer and dumps — desktop: ⌘/Ctrl+Enter or the "Dump" button; mobile: the round send button (composer is pinned directly under the title bar).

### Steps

1. Validate client-side: trimmed non-empty, ≤ `ENTRY_MAX_LENGTH` (10,000 chars).
2. Optimistic UI: the composer clears immediately; the entry appears at the top of Today.
3. Server action (`createDumpEntryAction`): Zod-validate → insert the entry (`isProcessed = false`). Nothing else runs — no background work of any kind.
4. On action failure the optimistic row is removed and the composer restores the text with an error hint (nothing is silently lost).

### Rules

- Capture is **zero-decision**: no title, no category, no size — plain text only.
- Multi-line entries: Enter inserts a newline; ⌘/Ctrl+Enter dumps (desktop). Composer is IME-safe like the AI chat composer (Enter committing a composition never submits).
- Entries are append-only in V1 — no edit, no delete (tracker: Future).
