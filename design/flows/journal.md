# Journal Flows

Flows for the journal page (`/kanban/journal`) — friction-free capture of whatever is in your head (thoughts, worries, diary entries), auto-categorized by an LLM in the background. Sibling docs: `design/flows/board.md`, `design/flows/plan.md`, `design/flows/priorities.md`, `design/flows/shared.md`, `design/flows/auth.md`.

> **Status: designed, pending implementation.** Exploration mockup (self-contained, per the scenario-first workflow): `design/mockup/future-work/mockup-journal.html`. Proposed schema lives in `design/baseline.md` (JournalEntry / JournalCategory, marked "designed"). When V1 lands it gets a scenario page at `/design/scenarios/journal` and the exploration mockup is deleted.

> **Doc convention:** One flow per `##` heading, separated by `---`. Every flow has two required `###` sections — `Trigger / Entry Point` and `Steps` — plus an optional `### Rules` section for constraints and invariants. Extra `###` sections are allowed only for reference material that fits neither Steps nor Rules.

---

## Journal Landing Flow (Browse)

### Trigger / Entry Point

User navigates to `/kanban/journal` via the "Journal" sidebar item (desktop) or the "Journal" dock tab (mobile — the dock grows to 5 tabs: Board · Priorities · Plan · Journal · Settings).

### Steps

1. Await `syncService.ensureSynced` like every kanban page (journal itself is plan-independent; the shared header still shows the current week).
2. Schedule the classification catch-up sweep (see **LLM Classification Flow**) — fire-and-forget, never blocks rendering.
3. Fetch the first feed page (newest `JOURNAL_PAGE_SIZE = 20` entries) plus all categories with per-category entry counts.
4. Render, top to bottom: capture composer (auto-focused on desktop), category filter row (All · Unsorted · one chip per category, each with a count), feed grouped by day (Today / Yesterday / weekday + date), newest first.
5. Infinite scroll: an IntersectionObserver sentinel near the feed bottom loads the next page by cursor and appends it (skeleton cards while in flight). At the end of history the sentinel is removed.

### Rules

- Feed order is `createdAt DESC, id DESC`; the cursor is the `(createdAt, id)` of the last row so pagination is stable while new entries are captured.
- Day grouping and "Today"/"Yesterday" labels use the `KANBAN_TZ` anchor (same as `dateUtils`).
- Filter chips are server-side filters, not in-memory: switching a filter resets the feed and re-queries from page one (All | Unsorted = `categoryId IS NULL` | a specific category).
- Entries longer than 6 rendered lines clamp with a "Show more" toggle (client-only).
- Chip rendering per entry: `PENDING` + fresh (< `CLASSIFYING_FRESH_WINDOW`, ~2 min) or an active poll → violet pulsing "Classifying…"; `PENDING` + stale → "Unsorted"; classified → the category chip, prefixed ✦ when `classifiedBy = LLM` (plain when `USER`). The ✦ mark is how the user tells AI sorting from their own.
- Empty state (no entries at all): composer stays; feed area shows the "Your journal is empty" empty state; filter row hidden.
- State lives in a `journalStore` (Zustand): loaded pages, categories + counts, active filter; hooks bridge to server actions per the store conventions.

---

## Quick Capture Flow

### Trigger / Entry Point

User types into the composer and captures — desktop: ⌘/Ctrl+Enter or the "Capture" button; mobile: the round send button (composer is pinned directly under the title bar).

### Steps

1. Validate client-side: trimmed non-empty, ≤ `ENTRY_MAX_LENGTH` (10,000 chars).
2. Optimistic UI: the composer clears immediately; the entry appears at the top of Today with the "Classifying…" chip.
3. Server action (`captureJournalEntryAction`): Zod-validate → create the entry (`categoryId = null`, `classifyState = PENDING`) → schedule background classification for that entry via Next.js `after()` (runs post-response — capture latency is one DB insert).
4. Client polls classification status for the new entry (short interval with backoff, give up after ~30 s); when the result lands, the chip swaps to the assigned category. On poll timeout the chip falls back to "Unsorted" — the sweep or a later visit resolves it.
5. On action failure the optimistic row is removed and the composer restores the text with an error hint (nothing is silently lost).

### Rules

- Capture is **zero-decision**: no title, no category picker, no size — plain text only. Categorization is never a prerequisite to saving.
- Capture never waits on the LLM; it completes when the row is persisted.
- Multi-line entries: Enter inserts a newline; ⌘/Ctrl+Enter captures (desktop). Composer is IME-safe like the AI chat composer (Enter committing a composition never captures).
- Entries are append-only in V1 — no edit, no delete (tracker: Future).

---

## LLM Classification Flow (background)

### Trigger / Entry Point

- **Post-capture:** `after()` hook classifies the just-captured entry once the capture response is sent.
- **Catch-up sweep:** on journal page load, classify `PENDING` entries older than ~1 min with `classifyAttempts < CLASSIFY_MAX_ATTEMPTS` (covers failed/interrupted calls — same idempotent on-visit pattern as `ensureSynced`; a future cron can take this over, see tracker).

### Steps

1. Load the target entries (sweep: oldest first, ≤ 10 per run) and the user's categories (name + description).
2. One non-streaming structured-output call (`gpt-5-nano`, `zodResponseFormat` — same stack as AI plan drafts). Input: entry texts + the category list referenced **by index** (the prompt never sees raw UUIDs). Output per entry: `{ existing category index }` **or** `{ newCategory: { name, description } }`.
3. Apply results in one transaction: create any new categories (normalize + dedupe by case-insensitive name — on collision assign the existing one; auto-assign `colorKey`), then set `categoryId`, `classifiedBy = LLM`, `classifyState = DONE` on each entry.
4. On LLM/apply failure: entries stay `PENDING`, `classifyAttempts` increments; entries at the attempt cap stop being retried and render as "Unsorted" (manual assignment always remains available).

### Rules

- **Skip guard:** classification only ever touches `classifyState = PENDING` rows — a manual assignment (`classifiedBy = USER`, including manual "Unsorted") is never overwritten, and `DONE` entries are never re-classified in V1.
- The LLM must prefer existing categories; it may propose a new one only when nothing fits. At the category cap (`CATEGORY_MAX_COUNT = 12`) the new-category option is removed from the output schema entirely — the LLM must choose the closest existing category.
- LLM-created categories follow the same constraints as user-created ones (name ≤ 24 chars, Title Case; one-line description). Descriptions feed future classification calls to keep category meaning stable.
- Prompt builder lives in `src/prompt/` and is never translated.

---

## Manual Recategorize Flow

### Trigger / Entry Point

User clicks/taps the category chip on an entry — desktop: a picker popover anchored to the chip; mobile: a bottom sheet (with a one-line quote of the entry). "Classifying…" chips are inert (no picker while a classification is in flight).

### Steps

1. The picker lists Unsorted + every category (color dot, name, entry count) with the current assignment checked, and a "New category…" input at the bottom (see **Create Category Flow**).
2. User picks a target: optimistic chip swap (and filter-row count updates), picker closes.
3. Server action persists `categoryId` (null for Unsorted), `classifiedBy = USER`, `classifyState = DONE`; owner-scoped; rollback on failure.

### Rules

- A manual choice is permanent against automation: the sweep/LLM never touches `classifiedBy = USER` entries — including manual Unsorted.
- The ✦ mark drops off the chip after a manual assignment (chip renders plain).
- Recategorizing is the only entry mutation in V1.

---

## Create Category Flow

### Trigger / Entry Point

- **User:** the "New category…" input inside the recategorize picker (popover / bottom sheet).
- **LLM:** during classification, when no existing category fits (see LLM flow).

### Steps

1. User path: enter a name → validate (trimmed non-empty, ≤ 24 chars, unique case-insensitive per user, under the cap) → create the category and assign the picker's entry to it in one transaction (`classifiedBy = USER`).
2. LLM path: handled inside the classification transaction with identical validation + dedupe.
3. Either path: `colorKey` is auto-assigned — the least-used color in the fixed `CATEGORY_COLORS` palette (8 keys; ties resolve in palette order). No color picker in V1.
4. The filter row gains the new chip with its count.

### Rules

- Cap: `CATEGORY_MAX_COUNT = 12` categories per user. At the cap the picker input renders disabled with a hint, and the LLM schema drops the new-category option.
- `createdBy` records whether the user or the LLM minted the category (surfaced later for category management).
- No rename / merge / archive in V1 (tracker: Future).
