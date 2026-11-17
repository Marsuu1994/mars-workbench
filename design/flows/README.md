# Flows

One spec per page — `board.md`, `plan.md`, `priorities.md`, `projects.md`, `dump.md`, `auth.md` (auth and settings) — plus `shared.md` for the cross-page sync lifecycle and `mcp.md` for planning with Claude over MCP. A spec says what the page shows and what the user can do there, item by item, and each item is held by a test. The decision record: `design/spike/spec-layers-v2.md`.

`board.md` is written in spec v2; the rest are still legacy docs (below) until each is migrated.

## Spec v2

Sections, in order:

- **States** — the page's states: what the server returns in each, and what the screen shows for it.
- **One section per area of the screen** (Columns, Task cards, Backlog…) — what it shows: its parts and what each one marks. Every number says what it counts, every list its order.
- **Actions** — a table: `ID · Action · Where · Server action · Result`; a client-only action's server action is `—`.
- **Rules** — the limits on the actions, each stated where it holds: on the board (UI) or on the server.
- **Journeys** — how the page is used day to day, as a chain of action IDs: the happy path only.

A page without a screen (sync, MCP) has only the sections it needs: MCP's Actions are its tools, one row per tool.

### Items and IDs

- Every item starts with an ID: `<AREA>-n` (`COL-2`, `BL-5`), `A` for actions, `R` for rules, `J` for journeys. IDs are never renumbered or reused; an item dropped goes together with its test.
- One ID is one thing a test's title can state in a sentence. A card's parts are one item, not one per field.
- An item says its facts in full rather than pointing to another area's ("in Todo's order"): two areas that agree today can part later. Pointing to an action, a move or a rule is fine.
- A test names the IDs it holds in its title: `it('COL-3 runs Done latest first')`, `it('CARD-2 R4 a Done card is dimmed and has no handle')`, `test('J2 …')`, a journey's `test.step('A4 …')`. A test may hold several IDs and an ID may be held by several tests; what counts is that every ID is held by at least one.
- *(pending)* marks an item designed but not built; *(bug)* a known bug, held by an `it.fails`.
- A section kept as it stands until a redesign is marked `> As is.` and has no IDs.

### What a spec doesn't say

- **Which test holds an item** — the test's title does.
- **Copy, pixels, colours, positions** — the mockup before the design is built, the Design Console after.
- **Implementation** — function names, query counts, callers: the code and `reference.md`.
- **Decisions and their reasons** — the spike and `baseline.md`'s Architecture Decision.

### Which test

An item is tested where its logic lives:

- a derivation in a pure helper → unit;
- a rule on the server, and an action's server side → integration;
- what a component shows for given data, and an action's client side (the action it calls, the optimistic change, the rollback) → component;
- a journey → e2e.

An item whose parts live in different layers is held at each: the returning user's recap is computed on the server (integration) and shown by the empty board (component), both tests naming ST-2. Two statements are two items, even about the same thing: Done cards locked on the board is one, the server refusing the move another.

## Legacy docs

The docs not migrated yet keep the old format: one flow per `##` heading, separated by `---`; each with `### Trigger / Entry Point` and `### Steps`, and optionally `### Rules`. They state facts, not UI detail or decisions.
