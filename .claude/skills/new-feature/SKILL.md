---
name: new-feature
description: Scaffold a new feature with folder structure, design doc templates, and CLAUDE.md registration
disable-model-invocation: true
user-invocable: true
argument-hint: "[feature-name]"
---

# Add a New Feature

Scaffold and design a new feature named `$0`.

Follow these steps **in order**. Do not proceed to the next step without explicit user approval.

## Step 1 — Understand the Feature

Ask the user to describe:

- **Purpose** — what does this feature do?
- **Key flows** — what are the main user interactions? (list names, details come later)
- **Route** — what URL path will this feature live at? (e.g., `/kanban`, `/chat`)
- **Entities** — any new database models needed?

## Step 2 — Scaffold Folder Structure

Create the feature directory at `ui/src/features/$0/` with this structure:

```
ui/src/features/$0/
├── actions/           # Server actions
├── services/          # Business logic
├── components/        # UI components
├── utils/             # Helpers and enums
├── design/
│   ├── baseline.md    # Goal, entities, schema
│   ├── flows.md       # Key flows
│   ├── api.md         # Actions & data layer contracts
│   └── mockup/
│       └── styles.css # Shared mockup styles
└── README.md          # Feature overview, current state, backlog, update log
```

Use the templates below for each design doc.

### baseline.md template

```markdown
# Baseline Design

## Goal

[One-paragraph description of the feature's purpose]

## Features

### Implemented

(none yet)

### Planned: V1

[Bullet list of V1 scope items]

### Planned: Future

(to be designed)

## Entities

[List entities and their key fields]

## Schema

[Prisma schema additions — models, relations, enums]
```

### flows.md template

```markdown
# Key Flows

[Flows will be added here via the `/new-flow` skill]
```

### api.md template

```markdown
# Actions & Data Layer

## Principles

- Before adding a new action or endpoint, check if an existing one can be extended to cover the case.
- Keep handlers thin — validate input, call service, return result. No business logic inside handlers.
- One handler per logical operation, not per UI interaction. A single handler can cover multiple related mutations.
- If two flows share the same mutation, they share the same handler. Never duplicate handler logic.
- Use Server Actions for mutations triggered from Server or Client Components. Use API routes when you need webhooks, streaming, or third-party callbacks.

## Data Fetching

(to be designed)

## Server Actions

(to be designed)
```

## Step 3 — Fill in Baseline

Based on the user's description from Step 1, fill in `baseline.md`:

- Write the Goal section
- List Planned V1 features
- Define entities and their key fields
- Draft the Prisma schema additions (models, relations, enums)

Present for approval.

## Step 4 — Register in CLAUDE.md

Update `CLAUDE.md`:

1. Add the feature to the **Project Structure** tree under `features/`
2. Add a row to the **Features** table with the feature name, status (`Scaffolded`), and route

## Step 5 — Create App Route

Create the Next.js page at `ui/src/app/$0/page.tsx` with a minimal placeholder:

```tsx
export default function [FeatureName]Page() {
  return <div>[Feature Name] — coming soon</div>
}
```

Add layout if needed (e.g., sidebar navigation).

## Step 6 — Design Flows

For each flow the user identified in Step 1, use the `/new-flow` skill:

```
/new-flow $0 [flow-name]
```

This will walk through Draft → Review → Mockup → Plan → Implement for each flow.
