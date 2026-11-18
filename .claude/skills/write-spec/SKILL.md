---
name: write-spec
description: Writing a page's spec v2 items from a decided mockup — the new behaviour marked *(pending)*, what it replaces marked *(removing)*, what the mockup leaves open listed for the owner — then reviewed by the write-spec-reviewer agent. Use once a design is decided and its spec isn't written yet, or when the owner asks to write or update the spec for a mockup (写 spec). Not for designing (ui-design), not for building the items (implement-spec), and not for a doc still in `design/specs/legacy.txt`, which is migrated to spec v2 first.
---

# Write spec — from a decided mockup to pending items

The spec is what the implementation is built and tested against, and the session that builds it works from the spec alone. The owner decides the design; this skill writes down what the design decided, and asks about the rest.

## 1. Read

`.claude/context/write-spec-context.md`, and everything it points to: the standard and the inputs. Stop before writing anything, and tell the owner, when:

- the page is listed in `design/specs/legacy.txt`: the doc is migrated to spec v2 first (`design/specs/README.md` › Legacy docs), a task of its own;
- nothing in the mockup is marked decided.

## 2. Write

1. **List what the decided mockup shows**, section by section, as `design/specs/README.md` › Writing items from a design › Covers the design sorts it, and set each line beside today's spec. Each line ends up as a new item, a change to a built one, or a question for the owner.
2. **Write the items** by `design/specs/README.md`: the markers and IDs by Items and IDs, the items themselves by Writing items from a design.
3. **Run `npm run check:spec`**, and fix the spec until it passes.

## 3. Review

1. Spawn the `write-spec-reviewer` agent with its brief: the spec's path, the mockup's path and its decided tab, the review log's path, the base to diff against, the owner's answers in this session that the review log doesn't hold yet, and the questions left open for the owner.
2. Fix each FAIL and run the reviewer once more. A FAIL you think is wrong goes to the owner with both readings; don't argue it away.

## 4. Report and hand off

1. Report to the owner: the items added and marked *(removing)*, by ID, one line each; the reviewer's verdict; and the questions, each with your recommendation.
2. The spec lands with no code, on the design PR or a spec PR of its own (AGENTS.md › UI Workflow). Rewrite the feature's tracker item to say the spec is written and list the questions still open: the implementing session reads them there.
3. The implementation starts from `main` with the `implement-spec` skill, from the spec and the mockup, not from this session's context.
