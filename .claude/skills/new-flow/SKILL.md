---
name: new-flow
description: Add a new flow to an existing feature following the gated workflow (Draft → Review → Mockup → Plan → Implement)
disable-model-invocation: true
user-invocable: true
argument-hint: "[feature] [flow-name]"
---

# Add a New Flow

Add a new flow to feature `$0` named `$1`.

Follow these steps **in order**. Do not proceed to the next step without explicit user approval.

## Step 1 — Read Context

Read the feature's existing design docs to understand current state:

- `ui/src/features/$0/design/baseline.md` — entities and schema
- `ui/src/features/$0/design/flows.md` — existing flows
- `ui/src/features/$0/design/api.md` — actions and DAL contracts

## Step 2 — Draft Flow

The user writes (or has already written) a draft flow definition. A well-formed flow includes:

- **Trigger** — what initiates the flow (user action, cron, event)
- **Steps** — ordered list of what happens
- **Rules** — constraints, edge cases, validation rules

If the user provides a rough description instead of a structured draft, help them shape it into this format.

## Step 3 — Review Flow

Review the draft for clarity and completeness:

- Are the steps unambiguous?
- Are edge cases covered?
- Does it conflict with or duplicate existing flows?
- Are entity/schema changes needed?

Present the updated flow for approval. Once approved, append it to `ui/src/features/$0/design/flows.md`.

## Step 4 — Mockup (if UI is involved)

Skip this step if the flow is purely backend (no new UI).

1. Use the `/frontend-design` skill to create an HTML mockup at `ui/src/features/$0/design/mockup/mockup-$1.html`
2. Link to the shared `./styles.css` in the mockup directory
3. Show only the screens relevant to this flow
4. Present for user review and iterate until approved

## Step 5 — Plan + Actions

Write the implementation plan:

1. Identify which layers are affected (Actions / Services / DAL / Components)
2. For each new or modified **server action**: write pseudocode and its DAL contract
3. For each new **DAL function**: specify the query shape (params, select fields, return type)
4. For each new **component**: note props interface and key behaviors
5. Append the action/DAL contracts to `ui/src/features/$0/design/api.md`

Follow the project's layer conventions:
- **Actions** — `'use server'`, thin: validate with Zod → call service → `revalidatePath`
- **Services** — business logic, no `'use server'`. Required when an action needs multiple DAL calls or conditional logic
- **DAL** — all Prisma queries in `src/lib/db/[resource]Queries.ts`, always use `select`
- Wrap multi-step mutations in `prisma.$transaction()`

Present the plan for approval.

## Step 6 — Implement

Implement based on the approved plan. Follow all coding conventions from CLAUDE.md:

- Named exports, `const` arrow functions, explicit `interface` for props
- Heroicons as JSX imports, daisyUI semantic tokens
- No raw string enums — use named constants
- Components > 100 lines of JSX → break into sub-components
- Match mockup exactly — raise blockers before deviating
