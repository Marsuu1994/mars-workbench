---
name: ui-design
description: Designing UI in this repository — a mockup of a new screen, state, layout or interaction, researched, drawn as options side by side, reviewed by the owner round by round until decided. Use whenever the owner asks for a mockup, a design, 设计, 画个 mockup, a new screen or a changed layout or interaction that isn't built yet — before any component code. Not for copy, colour or spacing tweaks the owner described exactly, and not for building a design that is already decided.
---

# UI design — from idea to a decided mockup

This skill covers the design: one design PR, from the first draft to the round the owner calls decided. The rules each step follows live in the docs it points to; read them at the step, not up front.

## 1. Rules

Read AGENTS.md › UI Workflow, then `design/README.md` › Mockups (how a mockup is drawn, hosted and reviewed), then `design/design-language/README.md` › Principles. The Principles are what the owner judges a design by: check every option against them before showing it.

## 2. What exists

- The feature's flow (`design/flows/<feature>.md`) and its Design Console scenario pages (`src/app/design/scenarios/<feature>/`): the states the design starts from.
- The components the change touches: their structure, tokens and `fx-*` utilities. Draw Before from them exactly, and grow After out of the same parts — the same card faces, kind colours and signals — rather than new ones.

## 3. Research

Before drawing, find how other products solve the same problem: patterns rather than products, each point with its source, and what it means for this design. A subagent can do the reading so the pages stay out of this session; ask it for the patterns, sources and fit, not the page contents.

## 4. Options

Draw `design/mockup/mockup-<area>.html` (one name from the first draft): every option side by side on one screen, each with its Before / After at desktop and mobile width, ranked by the Principles, with your recommendation; the research on its own screen; the freshness script in `<head>`. Check it renders before pushing — every screen, every theme, no console errors.

Rewrite the tracker item to say what the design does and link the mockup. Open the PR with the mockup's raw.githack link at the top of the description and the questions the owner has to decide under it; the Mockup links check prints the exact line when it is missing.

## 5. Review rounds

The owner answers on the PR or in a local session. Each round: change the mockup, push, answer each point, and log the round in `reviews/pr-<NNN>.md` (`reviews/AGENTS.md`; local-session rounds too). Once the owner picks an option, the mockup keeps only that one. When the owner says it is decided, mark the final round at the top of the mockup (`final version · decided <date>`) and the tracker item as decided; a change after that is an amendment with its date.

## 6. Handoff

The decided mockup and the review log are the handoff: together they say what was decided, what was turned down and why. Whoever writes the spec and builds the design starts from them, not from this session's context.

## After the design is decided

Until PR #106 settles whether the spec gets its own skill (its Q12–Q13), the rest follows the current rules:

- **Contract**: `e2e/contract/<feature>.spec.ts`, one `contractTest(title, failsAt, body)` per behaviour the mockup promises (`test/README.md` › e2e); each must fail at its `failsAt`. It lands in the design PR, which merges once CI is green and the owner approves.
- **Implementation**: a new branch from `main`, never stacked on the design PR. Build the mockup exactly (AGENTS.md › UI Workflow) with its scenario pages and gallery entries; when the contract passes, run the `npm run contract:flip <feature>` CI names; then delete the mockup and the tracker item.
