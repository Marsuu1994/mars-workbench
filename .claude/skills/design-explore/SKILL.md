---
name: design-explore
description: Explore a UI redesign for future work — generate mockups, archive to future-work, update design docs
disable-model-invocation: true
user-invocable: true
argument-hint: "[feature] [area]"
---

# Design Exploration (Future Work)

Explore a UI redesign for the `$1` area of the `$0` feature. This workflow is for designs that won't be implemented immediately — they get archived as approved future work.

Follow these steps **in order**. Steps marked with **STOP** require explicit user approval before proceeding. Do NOT bundle a STOP step with the next step — wait for the user to respond.

## Step 1 — Identify Pain Point · **STOP**

Ask the user to describe the UX problem they want to solve. Examples:

- "this page is too crowded"
- "this flow is confusing"
- "I want to reorganize the layout"

If the user already described the problem in their initial message, summarize your understanding back to them and ask clarifying questions (scope, affected screens, preferences).

**STOP — Wait for the user to confirm the pain point and answer any questions before proceeding.**

## Step 2 — Read Context & Propose Direction · **STOP**

Read the existing state to understand what's there today:

- `ui/src/features/$0/design/baseline.md` — entities, schema, current features
- `ui/src/features/$0/design/flows.md` — flows that touch the area being redesigned
- `ui/src/features/$0/design/mockup/mockup-$1.html` — current mockup (if it exists)

After reading, present a short **design proposal** to the user:

1. What changes you plan to make (layout, naming, interactions)
2. Which screens the mockup will include
3. Any open questions or trade-offs

**STOP — Wait for the user to approve the direction (or adjust it) before generating the mockup.**

## Step 3 — Generate Mockup · **STOP**

Use the `/frontend-design` skill to create a **temporary** Before / After HTML mockup.

- Place it at `ui/src/features/$0/design/mockup/temp-$1-v2.html`
- Show the current state (Before) alongside the proposed redesign (After)

**STOP — Present the mockup to the user. Iterate with feedback until they explicitly approve it.** Only proceed to archiving after approval.

## Step 4 — Archive to Future Work

Move the approved mockup to the `future-work/` directory:

```
ui/src/features/$0/design/mockup/future-work/mockup-$1-v2.html
```

**Cascade check:** If the redesign introduces new entity fields, UI patterns, or layout changes that affect other flows, generate updated mockups for those flows too and place them alongside:

```
design/mockup/
├── styles.css
├── mockup-board.html              # existing
├── mockup-plan-form.html          # existing
└── future-work/
    ├── mockup-$1-v2.html          # primary redesign
    └── mockup-[other-flow]-v2.html # cascading updates
```

## Step 5 — Update Design Doc

Add a one-line entry under `Planned: Future` in `ui/src/features/$0/design/baseline.md`:

```markdown
- [Description of the redesign] — see `mockup/future-work/mockup-$1-v2.html`
```

## Step 6 — Clean Up

Delete any temporary mockup files (e.g., `temp-$1-v2.html`) that were created during iteration.
