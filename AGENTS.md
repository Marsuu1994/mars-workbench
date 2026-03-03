# Mars Workbench Agent Guide (Shared)

This document is the common rulebook for all AI agents working in this repository.

## Scope

- Apply these rules to all agent sessions unless a tool-specific addendum says otherwise.
- Use [CLAUDE.md](./CLAUDE.md) only for Claude Code-specific behavior (skills and slash workflows).

## Project Overview

A Next.js application with multiple features: AI Chat and Kanban Period Planner.

## Tech Stack

- Framework: Next.js 16 (App Router)
- UI: React 19, Tailwind CSS 4, daisyUI 5 (custom `mars-dark` / `mars-light` themes)
- State: Zustand
- Database: PostgreSQL + Prisma ORM
- Icons: Heroicons
- Language: TypeScript

## Project Structure

```text
prisma/
├── schema.prisma                  # Database schema
└── migrations/                    # Database migrations
src/
├── app/
│   ├── api/
│   │   ├── llm/                   # LLM streaming + title summarization
│   │   └── chats/                 # Chat CRUD + messages endpoints
│   ├── chat/                      # Chat pages (layout, new, [chatId])
│   ├── kanban/                    # Kanban pages
│   │   ├── page.tsx               # Board page
│   │   └── plans/                 # Plan create/edit pages ([id], new)
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── generated/prisma/              # Generated Prisma client (gitignored)
├── lib/                           # Shared utilities
│   ├── prisma.ts                  # Prisma client singleton
│   └── db/                        # Data access layer
├── features/
│   ├── auth/                      # Auth feature (see features/auth/README.md)
│   ├── chat/                      # AI Chat feature (see features/chat/README.md)
│   └── kanban/                    # Kanban Planner feature (see features/kanban/README.md)
└── components/
    └── common/
        ├── Header.tsx
        └── ThemeProvider.tsx
```

## Workflow

### Session Start

Read feature design docs only when the task involves logic, data, or new flows. Skip for pure styling/copy/UI-only tweaks.

- `baseline.md`: schema or entity changes
- `flows.md`: flow changes or additions
- `api.md`: REST/server action/DAL changes
- `mockup/mockup-[flow].html`: flow-specific UI mockups

## UI Workflow

### Initial Design for a Complex Feature

When creating mockups for a new feature with multiple flows/pages, split into separate files in `features/[feature]/design/mockup/` with shared `styles.css`.

### Modify Existing UI Mockup

1. Create a temporary before/after HTML mockup for review.
2. Get user approval before code changes.
3. After approval, update source-of-truth mockup file and remove temporary file.

### Implementing UI Components

Implement approved mockups exactly (layout, spacing, text, colors, icons, states). If any part cannot be implemented as-is, raise blockers and update mockup first.

### Mockup Folder Policy

`mockup-v2/` is for future exploration only. Active/source-of-truth mockups belong in `mockup/`.

## Layers

- Actions (`features/[feature]/actions/`): `'use server'`, thin layer (validate with Zod -> call service -> `revalidatePath`)
- Services (`features/[feature]/services/`): business logic, no `'use server'`
- DAL (`src/lib/db/`): all Prisma queries
- If an action requires multiple DAL calls or conditional orchestration, extract to service.

## Coding Conventions

- Extract shared helpers to feature `utils/` folders; do not duplicate logic.
- Always use enum constants (for example `TaskType.WEEKLY`), not raw strings.
- Prefer `switch/case/default` for enum branching.
- Prefer batch DB operations (`createMany`, `updateMany`) over per-row loops when possible.
- Split very large JSX components into focused sub-components.
- Use Heroicons JSX imports, not inline SVG.
- Use `text-warning` for star/points icons.
- Prefer one broad query + in-memory filtering for small/moderate datasets.
- Use targeted DAL queries or DB aggregates for high-cardinality or known hotspots.
- For ACID-critical multi-step writes, use `prisma.$transaction()` with `tx?: Prisma.TransactionClient` in DAL writes.
- Keep file names aligned with component names when renaming.
- New conventions added to this file should include concrete bad/good examples.

## Code Style

- Named exports only (except Next.js `page.tsx` and `layout.tsx` defaults).
- Components as `const` arrow functions.
- Explicitly typed props, prefer `interface`.
- No `any`; use proper types or `unknown`.
- Prefer async Server Components where no client interactivity is needed.
- Add `'use client'` only when required.

## API Conventions

- API handlers live in `app/api/[resource]/route.ts`.
- Return via `NextResponse.json()`.
- Use consistent error shape: `{ error: string }`.
- Validate/parse request body before DB layer.
- Do not import Prisma directly in route handlers; go through DAL.

## State Management (Zustand)

- One store per feature at `features/[feature]/store/[feature]Store.ts`.
- No direct DB/fetch calls inside stores; use hooks/actions as bridge.
- Keep state flat.
- Use slice pattern when store grows beyond about five actions.

## Database / Prisma

- Keep Prisma queries in `src/lib/db/`.
- Use focused `select` fields unless full model is required.
- Prefer measured indexing based on query plans (`EXPLAIN ANALYZE`), not speculative index growth.

## Anti-Patterns to Avoid

- No inline styles; use Tailwind utility classes.
- No hardcoded color tokens like `text-yellow-400`; prefer semantic daisyUI tokens.
- No leftover `console.log` in committed code.
- No duplicated logic.
- No raw string enum values.
- No redundant actions/routes when existing handlers can be extended.
- No direct service/DAL calls from UI components.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Lint
npx prisma studio
npx prisma migrate dev
npx prisma generate
```
