---
name: implement-spec
description: Building a page's *(pending)* spec items — a test for each at the layer its logic lives in, the code, the markers dropped, the Design Console synced — then reviewed by the implement-spec-reviewer agent before the push. Use when the owner asks to implement or build a design whose spec has pending or removing items (实现、按 spec 做). Not for writing the spec (write-spec), not for designing (ui-design), and not for a change whose spec has no pending items.
---

# Implement spec — from pending items to built and tested

The scope is the spec: the items still marked *(pending)* or *(removing)* on the page. The spec says what each item does and the decided mockup how it looks. Behaviour the spec doesn't state is out of scope: raise it with the owner rather than build it. A question the spec left open (the inputs say where to find them) stops the work on the items it touches until the owner answers.

## 1. Read

`.claude/context/implement-spec-context.md`, and everything it points to: the standard and the inputs.

## 2. Plan

For each item, decide before writing it:

- the layer, or layers, that hold it (`test/README.md` › Which layer);
- which items share a test (`test/README.md` › Spec IDs);
- the data it needs: a new state usually means a new fixture in the scenarios' `fixtures.ts`, which the Design Console and the component tests share.

## 3. Build

Item by item, or a few that share a test at a time:

1. Write the test from the item's text, before the code (`test/README.md` › Spec IDs).
2. Run it and see it fail because the item isn't built (`test/README.md` › Every test).
3. Build the item (AGENTS.md › Layers, › Coding Conventions, › UI Workflow).
4. Run the test until it passes, then drop the item's *(pending)* marker. For an item marked *(removing)*, delete the item, its test and the code that only it needed.

A journey's e2e test runs with `npx playwright test e2e/<page>.spec.ts`. Sync the Design Console as the UI lands, and once every item the mockup shows is built, delete the mockup (AGENTS.md › UI Workflow).

## 4. Review

1. Run the checks in AGENTS.md › Version Control › Before every push, `npm run test:e2e` included.
2. Spawn the `implement-spec-reviewer` agent with its brief: the spec's path, the IDs this change built and removed, the mockup's path, and the base to diff against.
3. Fix each FAIL and run the reviewer once more. For an UNSURE, run the check it names yourself (break the line it names, see the test it names turn red), then put the code back. A FAIL you think is wrong goes to the owner with both readings.
4. When AGENTS.md › UI Workflow calls for a browser check, spawn `ui-verifier` with its own brief. The two reviews stay separate.

## 5. Report

Update the docs Before every push asks for. Then report to the owner, and put in the PR description: the items built and removed, by ID; the reviewers' verdicts; and anything raised along the way.
