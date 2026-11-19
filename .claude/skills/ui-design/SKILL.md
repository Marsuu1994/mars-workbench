---
name: ui-design
description: Designing UI in this repository — a mockup of a new screen, state, layout or interaction, researched, drawn as options side by side, reviewed by the owner round by round until decided. Use whenever the owner asks for a mockup, a design, 设计, 画个 mockup, a new screen or a changed layout or interaction that isn't built yet — before any component code. Not for copy, colour or spacing tweaks the owner described exactly, and not for building a design that is already decided.
---

# UI design — from idea to a decided mockup

This skill covers the design: one design PR, from the first draft to the round the owner calls decided. The rules each step follows live in the docs it points to; read them at the step, not up front.

## 1. Rules

Read AGENTS.md › UI Workflow, then `design/README.md` › Mockups (how a mockup is drawn, hosted and reviewed), then `design/design-language/README.md` › Principles (what the owner judges a design by, and how an agent uses them) and › Motion (shared baseline) (how anything that moves is timed).

## 2. What exists

- The current spec (`design/specs/<feature>.md`): where it covers the area, design within it; where it doesn't yet — the spec may come after the mockup — the owner's prompt is the requirement. Either way, what the design implies about behaviour goes where `design/README.md` › Mockups says, for the spec to write.
- The feature's Design Console scenario pages (`src/app/design/scenarios/<feature>/`): the states the screen is in today.
- The components the change touches: their structure, tokens, `fx-*` utilities and motion. They are what Before is drawn from (`design/README.md` › Mockups) and what After reuses before it adds a part of its own (Principles › 5).

## 3. Research

Before drawing, find how other products solve the same problem — what the research screen needs is in `design/README.md` › Mockups. A subagent can do the reading so the pages stay out of this session; ask it for patterns rather than products, each with its source and its fit for this design, not the page contents. Start with Apple — its HIG and its own apps are the owner's reference for how a thing should feel.

## 4. Options

Draw `design/mockup/mockup-<area>.html` as `design/README.md` › Mockups says: its name and its links, the options and how they are ranked, the research screen, what Before and After may show, the language, the freshness script. Draw what the owner will actually meet: the real combinations of data side by side (a habit-heavy day, a one-colour day), not one tidy case; and where the design is an interaction, make After clickable, so the owner tries it rather than reads about it. A design with several parts goes one module at a time, each on its own tab, merged into one final tab at the end. Check it renders before pushing: every screen, every theme, no console errors.

Rewrite the tracker item to say what the design does. When the owner asks for the PR (AGENTS.md › Version Control), its description opens with the mockup's link, and the questions the owner has to decide come under it.

## 5. Review rounds

The owner answers on the PR or in a local session, and often decides on seeing — "draw it and let me look", "take it out and let me see" — so answer a doubt with a drawing, not an argument. Each round: change the mockup, push, answer each point, and log the round (`reviews/AGENTS.md`). When a design or a module counts as decided is in `design/README.md` › Mockups; once it does, the tracker item says decided.

## 6. Handoff

The decided mockup and the review log are the handoff: together they say what was decided, what was turned down and why. Whoever writes the spec and builds the design starts from them, not from this session's context.

## After the design is decided

The `write-spec` skill writes the design's spec items next, and the implementation follows from `main` (AGENTS.md › UI Workflow).
