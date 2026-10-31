---
name: ui-design
description: The design PR for new or changed UI in this repository — mockup, the owner's review rounds on the PR, then the e2e contract — and the implementation PR that follows it. Use whenever the owner asks for a UI change that isn't built yet (a new screen, a new state, a changed layout or interaction), before writing any component code; also when picking up the implementation of a merged design. Not for copy, colour or spacing tweaks the owner described exactly.
---

# UI design → implementation

New UI lands in two PRs. The rules each step follows live in the docs this skill points to; read them at the step, not up front.

## Design PR

1. **Mockup.** Read the feature's flow (`design/flows/<feature>.md`), its scenario pages (`src/app/design/scenarios/<feature>/`) and the components it touches, then draw `design/mockup/mockup-<area>.html` (`design/README.md` › Mockups: self-contained, Before / After, one name from the first draft). Rewrite the tracker item to say what the design does and link the mockup.
2. **Open the PR** with the mockup's raw.githack link at the top of the description; the Mockup links check fails until it is there and prints the exact line to paste. Put the questions the owner has to decide under it.
3. **Review rounds.** The owner comments on the PR or attaches screenshots. Change the mockup, push, answer each thread, and log the round in `reviews/pr-<NNN>.md` (`reviews/AGENTS.md`). Repeat until the owner says the design is settled. No component code in this PR.
4. **Contract.** Once settled, write `e2e/contract/<feature>.spec.ts`: one `contractTest(title, failsAt, body)` per behaviour the mockup promises (`test/README.md` › e2e). Run it: each must fail at its `failsAt`, the first assertion the missing behaviour trips, before the test changes any data.
5. **Merge** once CI is green and the owner approves. The tracker item now says the design is merged and names the contract file.

## Implementation PR

A new branch from `main` after the design PR merged — never stacked on it.

1. **Flip first.** Before any code, run `npm run contract:flip <feature>` and commit it alone. The feature's tests now live in `e2e/features/` and fail; they are the definition of done.
2. Build the UI exactly as the mockup draws it (AGENTS.md › UI Workflow), with the scenario pages and gallery entries, until `npx playwright test e2e/features/<feature>.spec.ts` passes. Don't edit those tests to make them pass: a test that is wrong means the design changed, and that goes back to the owner.
3. Delete the mockup and the tracker item; the Design Console is the source of truth from here.
