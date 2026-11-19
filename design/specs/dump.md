# Dump Flows

Flows for the dump page (`/kanban/dump`) — friction-free brain dump of whatever is in your head (noise, negatives, ideas): type, dump, move on. Deliberately storage-only in V1 — no tags, no categories, no LLM.

> Screens: the Dump scenarios at `/design/scenarios/dump` (populated feed, empty state). Schema: `design/baseline.md` (DumpEntry).

---

## Dump Landing Flow (View)

### Trigger / Entry Point

User navigates to `/kanban/dump` via the "Dump" sidebar item (desktop) or the "Dump" dock tab (mobile).

### Steps

1. Dump is plan-independent: the page doesn't await `ensureSynced`, and the shared header shows the ISO week of today's date.
2. Fetch the first feed page (newest `DUMP_PAGE_SIZE = 20` entries) and the total entry count, in parallel.
3. Render, top to bottom: the title bar with the total count, the capture composer, then the feed grouped by day (Today / Yesterday / weekday + date), newest first.
4. Infinite scroll: an IntersectionObserver sentinel near the feed bottom loads the next page by cursor and appends it (skeleton cards while in flight). At the end of history the sentinel is removed; an invalid cursor stops paging silently, and the feed keeps what it has.

### Rules

- Feed order is `createdAt DESC, id DESC`; the cursor is the `(createdAt, id)` of the last row so pagination is stable while new entries are captured.
- Day grouping and "Today"/"Yesterday" labels use the `KANBAN_TZ` anchor (same as `dateUtils`).
- Entries longer than 6 rendered lines clamp with a "Show more" toggle (client-only).
- Empty state (no entries at all): composer stays; feed area shows the "Nothing here yet" empty state.
- `isProcessed` is never surfaced in the UI — it is a dormant flag reserved for a future LLM batch-processing flow (see tracker).

---

## Quick Capture Flow

### Trigger / Entry Point

User types into the composer, pinned under the title bar, and dumps: the "Dump" button, or ⌘/Ctrl+Enter on desktop.

### Steps

1. Validate: trimmed non-empty, at most `DUMP_ENTRY_MAX_LENGTH` (10,000 chars) — the field stops there, and the server checks the same.
2. Optimistic UI: the composer clears immediately, the entry appears at the top of Today and the title bar's count goes up by one.
3. Server action (`createDumpEntryAction`): Zod-validate → insert the entry (`isProcessed = false`). Nothing else runs — no background work of any kind.
4. On action failure the optimistic row is removed, the count goes back, and the composer restores the text with an error under it (nothing is silently lost).

### Rules

- Capture is **zero-decision**: no title, no category, no size — plain text only.
- One capture at a time: the next entry can be typed while the last one saves, and dumps once it has landed.
- Multi-line entries: Enter inserts a newline; ⌘/Ctrl+Enter dumps (desktop). Composer is IME-safe (Enter committing a composition never submits).
- Entries are append-only in V1 — no edit, no delete (tracker: Future).
