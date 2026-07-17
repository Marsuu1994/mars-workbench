---
name: design-explore
description: Explore a UI redesign for future work — generate mockups, archive to future-work, log in the tracker
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

- `design/baseline.md` — entities, schema, current features
- `design/flows/$0.md` — flows that touch the area being redesigned
- `src/app/design/scenarios/$0/` — the feature's scenario page (current screen states), plus the affected components under `src/components/`

After reading, present a short **design proposal** to the user:

1. What changes you plan to make (layout, naming, interactions)
2. Which screens the mockup will include
3. Any open questions or trade-offs

**STOP — Wait for the user to approve the direction (or adjust it) before generating the mockup.**

## Step 3 — Generate Mockup · **STOP**

Use the `/frontend-design` skill to create a **temporary** Before / After HTML mockup.

- Place it at `design/mockup/future-work/temp-$1-v2.html`
- Make it **self-contained** (inline styles, no shared stylesheets) — match the existing `future-work/` mockups
- Show the current state (Before) alongside the proposed redesign (After)

**STOP — Present the mockup to the user. Iterate with feedback until they explicitly approve it.** Only proceed to archiving after approval.

## Step 4 — Archive to Future Work

Rename the approved mockup to its final name:

```
design/mockup/future-work/mockup-$1-v2.html
```

**Cascade check:** If the redesign introduces new entity fields, UI patterns, or layout changes that affect other flows, generate updated mockups for those flows too and place them alongside:

```
design/mockup/future-work/
├── mockup-$1-v2.html            # primary redesign
└── mockup-[other-flow]-v2.html  # cascading updates
```

(When a redesign is later implemented, the feature's scenario page takes over as source of truth and the future-work mockup is deleted.)

## Step 5 — Update Tracker

Add a one-line open item to `design/tracker.md` under the feature's section (`## Board`, `## Plan`, … — typically under `### Future`):

```markdown
- [ ] [Description of the redesign] — see `design/mockup/future-work/mockup-$1-v2.html`
```

## Step 6 — Clean Up

Delete any temporary mockup files (e.g., `temp-$1-v2.html`) that were created during iteration.
