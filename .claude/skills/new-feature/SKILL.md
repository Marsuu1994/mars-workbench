---
name: new-feature
description: Scaffold a new feature with folder structure, centralized design-doc sections, and AGENTS.md registration
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

The codebase is layer-first — a new feature adds files to the existing layer folders instead of creating its own directory:

```
src/
├── actions/[$0]Actions.ts       # Server actions for the feature
├── services/[$0]Service.ts      # Business logic (if actions need orchestration)
├── components/$0/               # NEW folder — the feature's UI components
└── utils/ · store/ · hooks/     # Add files here only as needed
```

Then register the feature in the centralized design docs:

- Add a `$0` section to `design/baseline.md` (entities/schema — see Step 3)
- Create `design/flows/$0.md` from the flows template below
- Create the `design/mockup/$0/` directory (mockups link the shared `../styles.css` and `../mockup-theme.css`)

### Root README registration

Add a `### [Feature Name]` subsection under **Current State** in the root `README.md` ("(scaffolded — nothing implemented yet)") and note the scaffold in today's Update Log entry. No Backlog section anywhere — ideas and open items go to `design/tracker.md` under a `## [Feature Name]` section.

### design/flows/$0.md template

```markdown
# Key Flows

[Flows will be added here via the `/new-flow` skill]
```

No `reference.md` scaffolding is needed — action/DAL rows are appended to the existing tables in `design/reference.md` as flows are implemented (via `/new-flow` Step 5).

## Step 3 — Fill in Baseline

Based on the user's description from Step 1, fill in the new `$0` section of `design/baseline.md`:

- Write the feature's goal
- Define entities and their key fields
- Draft the Prisma schema additions (models, relations, enums)
- Add the planned V1 scope items to `design/tracker.md` under the new `## [Feature Name]` section

Present for approval.

## Step 4 — Register in AGENTS.md

Update `AGENTS.md`:

1. Add the feature to the **Project Structure** tree under `features/` with a one-line comment and its route
2. Update the `CLAUDE.md` skill examples if the new feature makes a better example

## Step 5 — Create App Route

Create the Next.js page at `src/app/$0/page.tsx` with a minimal placeholder:

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
