---
name: implement-spec
description: Building a page's *(pending)* spec items — a test for each at the layer its logic lives in, the code, the markers dropped, the Design Console synced — then reviewed by the implementation-reviewer agent before the push. Use when the owner asks to implement or build a design whose spec has pending or removing items (实现、按 spec 做). Not for writing the spec (write-spec), not for designing (ui-design), and not for a change whose spec has no pending items.
---

# Implement spec — from pending items to built and tested

The scope is the spec: the items marked *(pending)* or *(removing)* on the page this PR builds. The spec says what each item does, and the decided mockup says how it looks; the PR is done when no marker is left and `check:spec` passes (`test/README.md` › Spec IDs). Behaviour the spec doesn't state is out of scope: raise it rather than build it.

## 1. Inputs

Read these before writing code:

- The page's spec, `design/flows/<page>.md`, and `npm run check:spec -- --list <page>`, which lists the pending and removing items. If the spec PR left a question open, stop and ask the owner.
- The decided mockup, `design/mockup/mockup-<area>.html`, for layout, copy, spacing, colours, icons and states. Build it exactly (AGENTS.md › UI Workflow); if something can't be built as drawn, stop and raise it, and the mockup and the spec change first.
- `test/README.md`, in full, and `design/flows/README.md` › Which test.
- What AGENTS.md › Session start says the change needs: `design/baseline.md` › Architecture Decision when a page's data flow changes, and `design/reference.md` when actions, services or the DAL change.
- The page's Design Console scenarios, `src/app/design/scenarios/<feature>/`, and `src/app/design/README.md`: their fixtures are the component tests' data too.

## 2. Plan

For each item, decide before writing it:

- the layer its logic lives in (`design/flows/README.md` › Which test), and the part that only a real server shows, which a journey step holds too;
- which items share a test: the IDs one scenario can assert together go into one test (`test/README.md` › Write tests sparingly);
- the data it needs: a new state usually means a new fixture in the scenarios' `fixtures.ts`, which the console and the tests share.

## 3. Build

Item by item, or a few that share a test at a time:

1. **Write the test from the item's text**, not from the code you're about to write: its assertions are the outcomes the item states — the counts, the order, what is absent. Its title starts with the IDs it holds, and the file starts with `// Spec: design/flows/<page>.md`.
2. **See it fail** (`test/README.md` › See it fail): run it before building, and check it fails because the item isn't built.
3. **Build it** by AGENTS.md: the layers, page structure, a data rule where every write path passes (the page's actions and the MCP tools), copy from the mockup into `en.json`, constants, enums.
4. **Make it pass**, then drop the item's *(pending)* marker. For an item marked *(removing)*, delete the item, its test and the code it held.

Along the way:

- Unit tests come with the pure helpers they test, for their edge cases; they don't have to come first.
- Journey items go into the page's e2e spec, one `test.step` per action (`test/README.md` › e2e). Run them with `npx playwright test e2e/<page>.spec.ts`.
- Sync the Design Console as the UI lands: a scenario tab for each new state, so the console's pinned states match production (AGENTS.md › UI Workflow).
- Once every item from the mockup is built, delete the mockup.

## 4. Check and review

1. Run the checks in AGENTS.md › Version Control › Before every push, `npm run test:e2e` included, since the change touches a page's flow.
2. Spawn the `implementation-reviewer` agent with its brief: the spec's path, the IDs this PR built and removed, the mockup's path, and the base to diff against (`main`).
3. Fix each FAIL and run the reviewer once more. For an UNSURE, run the check it names yourself (it says which code to break and which test should turn red), then put the code back. A FAIL you think is wrong goes to the owner with both readings.
4. When AGENTS.md › UI Workflow calls for a browser check (a layout change, a new or changed scenario tab), spawn `ui-verifier` as well, with its own brief. The two reviews stay separate.
5. Update the docs Before every push asks for: the tracker, README Current State, and `design/reference.md` when actions, services or the DAL changed.
6. Report to the owner, and put in the PR description: the items built and removed, by ID; the reviewers' verdicts; and anything raised along the way.
