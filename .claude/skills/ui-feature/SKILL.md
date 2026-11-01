---
name: ui-feature
description: "What: the workflow for a UI feature, new screens or changes to existing ones, from the owner's request to shipped code: a mockup the owner reviews on a design PR until approved, an e2e contract pinning it, then an implementation PR that builds it. When to use: the owner asks for UI that isn't built yet (a new screen, a new state, a changed layout or interaction), before writing any component code; or a merged design is ready to implement. When not to use: a UI bug (existing UI behaving wrong: fix it with a failing test first, test/README.md); copy, colour or spacing tweaks the owner described exactly."
---

# UI feature: design → implementation

New UI lands in two PRs. The rules each step follows live in the docs this skill points to; read them at the step, not up front.

## Design PR

1. **Mockup.** Read the feature's flow (`design/flows/<feature>.md`), its scenario pages (`src/app/design/scenarios/<feature>/`) and the components it touches, then draw `design/mockup/mockup-<area>.html` (`design/README.md` › Mockups: self-contained, Before / After, one name from the first draft). Rewrite the tracker item to say what the design does and link the mockup.
2. **Open the PR** with the mockup's raw.githack link at the top of the description; the Mockup links check fails until it is there and prints the exact line to paste. Put the questions the owner has to decide under it.
3. **Review rounds.** The owner comments on the PR or attaches screenshots. Change the mockup, push, answer each thread, and log the round in `reviews/pr-<NNN>.md` (`reviews/AGENTS.md`). Repeat until the owner says the design is settled. No component code in this PR.
4. **Contract.** Once settled, add one e2e test per behaviour the mockup promises, written like any other e2e test and placed in the spec it belongs to, but declared `test.fail(title, {tag: '@<area>'}, body)` for `mockup-<area>.html` (`test/README.md` › e2e). Reuse the existing helpers. Run them once and list in the PR description where each fails — the assertion the missing behaviour trips, not a locator or helper.
5. **Merge** once CI is green and the owner approves.

## Implementation PR

A new branch from `main` after the design PR merged — never stacked on it.

1. **Drop `.fail` first.** Before any code, turn the feature's contracts (`grep -rn "@<area>" e2e`) into plain tests: remove `.fail` and the tag. They fail now; they are the definition of done.
2. Build the UI exactly as the mockup draws it (AGENTS.md › UI Workflow), with the scenario pages and gallery entries, until those tests pass locally. Push only once they do. A broken helper or locator is yours to fix; an assertion that seems wrong means the design changed, and that goes back to the owner.
3. Delete the mockup and the tracker item; the Design Console is the source of truth from here. `npm run check:contracts` fails if a contract for it is still a `test.fail`.
