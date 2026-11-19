# Specs

One spec per page — `board.md`, `plan.md`, `priorities.md`, `projects.md`, `dump.md`, `auth.md` (auth and settings) — plus `shared.md` for the cross-page sync lifecycle and `mcp.md` for planning with Claude over MCP. A spec says what the page shows and what the user can do there, item by item, and each item is held by a test. The decision record: `design/spike/spec-layers-v2.md`.

`board.md` is written in spec v2; the docs listed in `legacy.txt` are still legacy docs (below) until each is migrated. This folder was `design/flows/` until PR #120, and specs were called flow docs; older reviews and archived spikes still say so.

This file is the one home of the rules for writing a spec. The `write-spec` skill and the `write-spec-reviewer` agent point here rather than restate them (AGENTS.md › Adding a rule); how a test holds an item is `test/README.md`'s.

## Spec v2

Sections, in order:

- **States** — the page's states: what the server returns in each, and what the screen shows for it.
- **One section per area of the screen** (Columns, Task cards, Backlog…) — what it shows: its parts and what each one marks. Every number says what it counts, every list its order.
- **Actions** — a table: `ID · Action · Where · Server action · Result`; a client-only action's server action is `—`.
- **Rules** — the limits on the actions, each stated where it holds: on the board (UI) or on the server.
- **Journeys** — how the page is used day to day, as a chain of action IDs: the happy path only.
  - A journey runs the same steps on the same data at both widths. The desktop journey is written out in full, and the mobile one sits right after it, pointing to it and naming only the steps that differ (a drag that is a tap on a phone). Journeys sit by what they do, never grouped by width.
  - A journey's title names its width after a dash, `J12 A week's work - desktop`, never in brackets, which are kept for the markers. A path only one width has, such as finishing a backlog card by dragging it onto Done, is a journey of its own marked `- desktop-only` (or `- mobile-only`), with no pair.
  - A design that changes how the page looks updates the journeys it touches, with data that shows it (a backlog holding piles); a new journey is only for a new path or a new state the user reaches, such as an empty column.

A page without a screen (sync, MCP) has only the sections it needs: MCP's Actions are its tools, one row per tool.

### Items and IDs

- Every item starts with an ID: `<AREA>-n` (`COL-2`, `BL-5`), `A` for actions, `R` for rules, `J` for journeys. A new ID is one more than the highest its area has in the doc (`BL-9` → `BL-10`), whether the item is new or replaces a changed one. IDs are never renumbered. When the highest ID of an area is deleted, the next new item takes its number again: an ID names one item in the spec as it stands, and an older PR or review that names it meant the item of its day.
- Items sit where a reader looks for them, not in ID order: the IDs only name items. A new item sits beside the one it replaces or the ones it belongs with, and an area with many items on one subject gives them a `###` heading of their own (Board › Backlog › Groups).
- One ID is one thing a test's title can state in a sentence. A card's parts are one item, not one per field. Two statements are two items, even about the same thing: Done cards locked on the board is one, the server refusing the move another.
- An item says its facts in full rather than pointing to another area's ("in Todo's order"): two areas that agree today can part later. Pointing to an action, a move or a rule is fine.
- Every item is held by at least one test that names its ID in its title (`test/README.md` › Spec IDs).
- An item's marker says where it stands, and sits before its ID, so it is the first thing a reader sees: `- *(pending)* **BL-8** …`, `| *(pending)* A8 | …`; `check:spec` reads a marker nowhere else. The markers matter most while the spec is merged and its implementation PR isn't yet:
  - no marker: built, and held by a test.
  - *(pending)*: designed but not built. No test may name it yet; the implementation PR drops the marker and writes its test.
  - *(removing)*: built and still held by its test, but the design drops it. The implementation PR deletes the item, and `check:spec` then fails until its test is deleted too.
  - *(bug)*: built but wrong, held by an `it.fails`.
- An implementation PR is done when the items its design marked *(pending)* or *(removing)* have no marker left and `check:spec` passes.
- A change to an item that's already built: when the spec and the code change in the same PR, edit the item and its test together. When the spec is merged first, mark the old item *(removing)*, say "replaced by" and the new ID, and give the new behaviour a new ID marked *(pending)*. It gets a new ID, rather than the old one marked as changing, so the implementation PR can't pass `check:spec` without deleting the old test and writing the new one.
- A section kept as it stands until a redesign is marked `> As is.` and has no IDs.

### Writing items from a design

A design's items come from its decided mockup (what counts as decided: `design/README.md` › Mockups) and from what the owner decided in words on its PR.

- **Covers the design**: everything the decided mockup shows is in the spec, in the section it belongs to (Spec v2 above):
  - each state: States;
  - what an area shows: that area's section;
  - each thing the user can do: Actions, with its server action, or `—` when it stays on the client;
  - each limit: Rules;
  - a new daily path or a new state the user reaches: Journeys (Spec v2 › Journeys).
- **Decidable**: an item states what the user can observe — what is counted, the numbers and caps, the order, what is absent — so that, given the data, anyone can say whether the screen does it, and two tests of it would assert the same thing. Bad: "A group shows a pile." Good: "A group with tasks behind its next one shows one thin sheet for each of them, at most three, and **+N more**, N being how many are behind; the last task of a group shows neither."
- **Each layout**: when desktop and mobile differ, the item says what each one does.
- **Motion**: a motion goes into an item only as far as a test can hold it. The item names the motion by its `fx-*` utility and states:
  - what sets it off, and which element it plays on;
  - that once it has ended the layout is the same as at rest;
  - that nothing plays when the system asks for reduced motion.

  Its duration and its curve are the utility's, not the item's (What a spec doesn't say).
- **Both sides of a limit**: when the UI stops the user from changing data in some way (a Done card can't be dragged back), the server refuses it too, and that refusal is an item of its own in Rules (R4 on the board, R1 on the server): a data rule lives where every write path passes (AGENTS.md › Layers). Only the owner makes an exception, never the agent; its item says the server doesn't hold the limit and which writes stay free of it. The exceptions so far: Board R6, where only the board limits pulling to a group's next task; the server doesn't check the order, so a write path outside the board, such as a future Claude tool over MCP, wouldn't be held to it.
- **Only what was decided**: what neither the decided mockup nor the owner's words decide is a question for the owner, not an item. The mockup's options that weren't picked, its research and its ideas for the spec decide nothing, and its Before is only today's state. An item that needs the owner's answer waits for it.
- **Only what the design changes**: built items the design doesn't touch stay as they are. A built item that is simply wrong is a fix of its own, not part of the design's change.

### What a spec doesn't say

- **Which test holds an item** — the test's title does, and `npm run check:spec -- --list <page>` lists them. Which layer tests it: `test/README.md` › Which layer.
- **Copy, pixels, colours, positions** — the mockup before the design is built, the Design Console after.
- **How a motion looks** — its duration, its curve and what moves by how much: the `fx-*` utility, set out in `design/design-language/README.md` › Motion and shown by the Design Console.
- **Implementation** — function names, query counts, callers: the code and `reference.md`.
- **Decisions and their reasons** — the spike and `baseline.md`'s Architecture Decision.

## Legacy docs

The docs not migrated yet keep the old format: one flow per `##` heading, separated by `---`; each with `### Trigger / Entry Point` and `### Steps`, and optionally `### Rules`. They state facts, not UI detail or decisions.

A legacy doc can be corrected, but not grown. Fixing a wrong sentence is fine; a new flow, step or rule means migrating the whole doc to spec v2 first, as `board.md` was. `npm run check:spec` holds this, comparing with main where the branch left it:

- new docs: a doc not in `legacy.txt` is written in spec v2, so it has IDs;
- the list: it only gets shorter, and a doc leaves it in the change that gives it IDs;
- growth: a doc in `legacy.txt` may not have more headings or list items than on main.
