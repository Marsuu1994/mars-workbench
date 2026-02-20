# Mars Workbench

A Next.js application with multiple features: AI Chat and Kanban Period Planner.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, daisyUI 5 (Forest theme)
- **State**: Zustand
- **Database**: PostgreSQL + Prisma ORM
- **Icons**: Heroicons
- **Language**: TypeScript

## Project Structure

```
ui/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Database migrations
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── llm/               # LLM streaming + title summarization
│   │   │   └── chats/             # Chat CRUD + messages endpoints
│   │   ├── chat/                  # Chat pages (layout, new, [chatId])
│   │   ├── kanban/                # Kanban pages
│   │   │   ├── page.tsx           # Board page
│   │   │   └── plans/             # Plan create/edit pages ([id], new)
│   │   ├── layout.tsx             # Root layout
│   │   └── globals.css            # Global styles
│   ├── generated/prisma/          # Generated Prisma client (gitignored)
│   ├── lib/                       # Shared utilities
│   │   ├── prisma.ts              # Prisma client singleton
│   │   └── db/                    # Data access layer
│   ├── features/
│   │   ├── chat/                  # AI Chat feature (see features/chat/README.md)
│   │   │   ├── components/        # ChatArea, ChatBubble, Sidebar, etc.
│   │   │   ├── hooks/             # useChat
│   │   │   └── store/             # chatStore (Zustand)
│   │   └── kanban/                # Kanban Planner feature (see features/kanban/README.md)
│   │       ├── actions/           # Server actions (thin: validate → service → revalidate)
│   │       ├── services/          # Business logic (planService, boardService)
│   │       ├── components/        # UI components
│   │       ├── utils/             # dateUtils, taskUtils, enums
│   │       ├── schemas.ts         # Zod validation schemas
│   │       └── design/            # Design docs (baseline.md, flows.md, api.md)
│   │           └── mockup/        # Per-flow HTML mockups + shared styles.css
│   └── components/
│       └── common/
│           └── Header.tsx         # Shared header component
```

## Features

| Feature | Status | Route |
|---------|--------|-------|
| AI Chat | Live | `/chat` |
| Kanban Planner | In progress | `/kanban` |

## Workflow

### Session Start

Read the relevant feature's design docs **only when the task involves logic, data, or new flows**. Skip for pure styling, copy changes, or UI tweaks with no logic involved.

| Doc           | Read when                                       |
|---------------|-------------------------------------------------|
| `baseline.md` | Schema or entity changes                        |
| `flows.md`    | Flow changes or additions                       |
| `api.md`      | REST API routes or server action or DAL changes |
| `mockup/mockup-[flow].html` | UI mockups by flow                |

### Adding a New Flow

Follow these steps in order. Do not proceed to the next step without explicit user approval.

1. **Draft** — User writes draft flow (Trigger / Steps / Rules)
2. **Review flow** — Review the draft, suggest edits for clarity and completeness, present updated flow for approval
3. **Mockup** *(if UI is involved)* — Create an HTML mockup and present for approval before writing any logic
4. **Plan + Actions** — Write the implementation plan and fill in `actions.md` with pseudocode and DAL contracts, present for approval
5. **Implement** — Implement based on approved actions

## UI Workflow

### Initial Design for a Complex Feature

When creating mockups for a new feature with multiple flows or pages, split them into separate files — one per flow or page — rather than one monolithic file. Place them in `features/[feature]/design/mockup/` alongside a shared `styles.css`:

```
design/mockup/
├── styles.css                   # shared colors, layout, components
├── mockup-board.html            # one file per distinct flow or page
├── mockup-plan-form.html
└── mockup-remove-instances.html
```

Each file should be self-contained (link to `./styles.css`) and represent only the screens relevant to that flow.

### Adding a New Element to Existing UI

1. Generate a **temporary HTML mockup** showing a side-by-side Before / After to illustrate the change
2. Present for user review and approval before touching any code
3. After approval:
   - Implement the change in code
   - Update the relevant `mockup/mockup-[flow].html` to reflect the new UI state
   - Delete the temporary mockup file

## Layers

- **Actions** (`features/[feature]/actions/`) — `'use server'`, thin layer: validate input with Zod → call service → `revalidatePath`
- **Services** (`features/[feature]/services/`) — business logic, no `'use server'`
- **DAL** (`src/lib/db/`) — all Prisma queries, file naming: `[resource]Queries.ts`
- If an action requires more than one DAL call or any conditional logic → extract to a service. Actions that wrap a single DAL call can skip the service layer.

## Coding Conventions

- Extract shared helper functions into `utils/` directories within the relevant feature folder (e.g., `features/kanban/utils/dateUtils.ts`). Never duplicate utility functions across files.
- Always reference enums via their named constant (e.g., `TaskType.WEEKLY`) instead of raw strings (`"WEEKLY"`).
- Use `switch/case/default` instead of `if/else if` when branching on enum values.
- Prefer batch operations (e.g., `createMany`, `updateMany`) over loops with individual database calls unless unavoidable.
- When a UI component exceeds ~100 lines of JSX (e.g., a large form or modal), break it into logically grouped sub-components in a directory named after the parent (e.g., `template-modal/TemplateModal.tsx` with sub-components alongside it). Keep the parent as a slim orchestrator.
  - Bad: a single 300-line `TemplateModal.tsx` with header, form fields, type selector, preview, and footer all inline
  - Good: `template-modal/TemplateModal.tsx` (shell + state) importing `TemplateModalHeader`, `TemplateModalFooter`, `TypeSelector`, `IconNumberField`
- Use Heroicons as JSX imports (e.g., `<PlusIcon />`) instead of inline SVG.
- Group logically related utility functions into a single file (e.g., `taskUtils.ts` for sorting and grouping tasks) rather than splitting each function into its own file.
- Use `text-warning` for all star/points icons to maintain visual consistency across the app.
- When you need both a full dataset and a filtered subset, fetch once from the DB and filter in-memory on the server side. Do not issue multiple DB queries for overlapping data.
  - Bad: `boardTasks = getTasksByStatus([TODO, DOING, DONE])` + `allTasks = getTasksByStatus([TODO, DOING, DONE, EXPIRED])`
  - Good: `allTasks = getTasksByPlanId(planId)` then `boardTasks = allTasks.filter(t => t.status !== EXPIRED)`

## Code Style

- Use named exports only — no default exports except for Next.js page components (`page.tsx`, `layout.tsx`)
- Define components as `const` arrow functions: `const MyComponent = () => { ... }`
- Always type props explicitly with an `interface` (not `type` alias):
  ```ts
  // Good
  interface TaskCardProps { taskId: string; onComplete: () => void }
  // Bad
  type TaskCardProps = { taskId: string; onComplete: () => void }
  ```
- No `any` type — use `unknown` or proper types; add a comment if casting is truly unavoidable
- Prefer async Server Components over Client Components when there is no interactivity
- Add `'use client'` only when necessary: event handlers, browser APIs, or React hooks that require it

## API Conventions

- API route handlers live in `app/api/[resource]/route.ts`
- Always return responses via `NextResponse.json()`
- Use a consistent error shape: `{ error: string }`
  ```ts
  // Good
  return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  ```
- Validate and parse the request body before passing data to the DB layer
- Never import Prisma directly inside route handlers — always go through `src/lib/db/`

## State Management (Zustand)

- One store per feature, located at `features/[feature]/store/[feature]Store.ts`
- Never call the DB or fetch API directly inside a store — use hooks or server actions as the bridge
- Keep store state flat; avoid deeply nested objects
- Use slice pattern if a store grows beyond ~5 actions

## Database / Prisma

- All Prisma queries live in `src/lib/db/` — never import `prisma` directly in components or API routes
- File naming: `[resource]Queries.ts` (e.g., `taskQueries.ts`, `chatQueries.ts`)
- Always use `select` to limit returned fields unless the full model object is needed
  ```ts
  // Good
  await prisma.task.findMany({ select: { id: true, title: true, status: true } })
  // Bad
  await prisma.task.findMany()
  ```

## Anti-patterns to Avoid

- No inline styles — use Tailwind utility classes only
- No hardcoded color classes (e.g., `text-yellow-400`) — use daisyUI semantic tokens (e.g., `text-warning`, `text-primary`)
- No `console.log` left in committed code
- No duplicated logic — extract to utils before writing similar code a second time
- No raw string enum values — always use the named enum constant
- No redundant actions/api routes — if an existing action can be extended to cover a new case, extend it rather than creating a new one
- No direct service or DAL calls from UI — server components and client components must only interact through server actions or REST API routes
  ```ts
  // Bad: server component calls a service directly
  const board = await fetchBoard()        // service function called in page.tsx

  // Good: server component calls a server action
  const board = await fetchBoardAction()  // action wraps the service
  ```

## Commands

```bash
cd ui && npm run dev      # Start dev server
cd ui && npm run build    # Production build
npx prisma studio         # Open Prisma database GUI
npx prisma migrate dev    # Run database migrations
npx prisma generate       # Regenerate Prisma client
```