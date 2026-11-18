---
name: write-spec
description: Writing a page's spec v2 items from a decided mockup — the new behaviour marked *(pending)*, what it replaces marked *(removing)*, what the mockup leaves open listed for the owner — then reviewed by the spec-reviewer agent. Use once a design is decided and its spec isn't written yet, or when the owner asks to write or update the spec for a mockup (写 spec). Not for designing (ui-design), not for building the items (implement-spec), and not for a doc still in `design/specs/legacy.txt`, which is migrated to spec v2 first.
---

# Write spec — from a decided mockup to pending items

The spec is what the implementation is built and tested against, and the agent that builds it works from the spec alone. So every item must be decidable: given the data, a reader can say whether the screen does it or not, and two people writing its test would assert the same thing. The owner decides the design; this skill only writes down what the design decided, and asks about the rest.

## 1. Inputs

Read these before writing anything:

- `design/specs/README.md`, in full: the format, the markers and the ID rules this skill follows.
- The page's spec, `design/specs/<page>.md`, and what is built today: `npm run check:spec -- --list <page>` prints each item with where it stands and the tests holding it. If the page is listed in `design/specs/legacy.txt`, stop: the doc is migrated first, which is a task of its own the owner starts.
- The decided mockup, `design/mockup/mockup-<area>.html`. Only the decided content counts: the tab marked `final version · decided`, 定稿 or ✓, with its dated amendments. Options that weren't picked, the research and the ideas are not decisions, and Before is only today's state. If nothing in the mockup is marked decided, stop and ask the owner.
  - Read its text and its script. The script is the mockup's behaviour model: its state and its handlers say what a click changes, what a count counts and what happens to the last one.
  - The mockup's ideas for the spec (`design/README.md` › Mockups) are questions, not answers: an idea becomes an item only when the owner decided it in the review log.
- The design PR's review log, `reviews/pr-<NNN>.md`, and the feature's item in `design/tracker.md`: decisions the owner made in words that the drawing doesn't show.

## 2. Inventory the mockup

Before writing items, list everything the decided tab shows, and compare each line with today's spec:

- states: every state the screen can be in, and the data that puts it there (empty, one left, many, past a cap);
- numbers: what each count counts, its cap, and when it disappears;
- lists: each list's order, and how ties are broken;
- controls: where each one is at each width, what it does on screen, and what it asks the server to save;
- limits: what isn't a control, what can't be dragged or tapped, and what the server must refuse;
- changes: each item in today's spec that the mockup contradicts, narrows or drops.

Every line ends up as an item, a case inside one, a row in Actions, a rule, or a question for the owner.

## 3. Write the items

- **Markers and IDs**, as `design/specs/README.md` › Items and IDs says:
  - new behaviour is a new item marked *(pending)*;
  - a built item the design changes is marked *(removing)* and says "replaced by" the new ID, which is marked *(pending)*; a built item the design drops is marked *(removing)*;
  - never edit a built item in place to mean the new behaviour: its old test would still pass, and the implementation could keep it;
  - a new ID takes the next number its area has never used. IDs are never reused, so check the doc's history, not just the doc: `git log -p -- design/specs/<page>.md | grep -oE '\*\*[A-Z]+-?[0-9]+\*\*|^\+\| [A-Z]+-?[0-9]+ ' | sort -u`.
- **Decidable**: each item states the outcome a user can observe — what is counted, the numbers and caps, the order, what is absent, and what each width does when the widths differ. Bad: "BL-10 *(pending)* A group shows a pile." Good: "BL-10 *(pending)* A group with tasks behind its next one shows one thin sheet for each of them, at most three, and **+N more**, N being how many are behind; the last task of a group shows neither."
- **Both sides of a limit**: when the UI stops offering something that guards data (only a project's next step can be pulled), the server's refusal is an item of its own in Rules, because a data rule lives where every write path passes (AGENTS.md › Layers). What the server must now send for the design goes into States.
- **Actions and journeys**: a new control is a row in Actions; a changed result of a move goes into A move. A design that adds a daily path adds a journey or extends one, the happy path only.
- **Not in a spec**: copy, pixels, colours, positions, implementation names and reasons (`design/specs/README.md` › What a spec doesn't say). Those stay in the mockup and the review log.
- **Don't invent**: what the mockup and the review log don't decide is a question for the owner, never settled in the spec. An item that needs the answer is left out until the owner answers.
- **Stay in scope**: keep the sections in their order, and leave the built items alone unless the design changes them. A built item that is simply wrong is a separate fix, not part of this change.

## 4. Check and review

1. `npm run check:spec` passes: pending items need no test yet, and items marked *(removing)* keep theirs until the implementation deletes them.
2. Spawn the `spec-reviewer` agent with its brief: the spec's path, the mockup's path and its decided tab, the review log's path, the base to diff against (`main`), and any answers the owner gave in this session that the review log doesn't hold yet.
3. Fix each FAIL and run the reviewer once more. A FAIL you think is wrong goes to the owner with both readings; don't argue it away.
4. Report to the owner: the items added and marked *(removing)*, by ID and in one line each; the reviewer's verdict; and the questions, each with your recommendation.

## 5. Handoff

The spec lands with no code, in its own commit: on the design PR when the design is still open, or on a spec PR from `main` when the design has merged. Rewrite the feature's tracker item to say the spec is written and what is still open. The implementation follows from `main` with the `implement-spec` skill, starting from the spec and the mockup, not from this session's context.
