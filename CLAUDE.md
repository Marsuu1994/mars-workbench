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
│   │       ├── design.md          # Full design doc (schema, API, flows)
│   │       └── mockup.html        # Interactive UI mockups
│   └── components/
│       └── common/
│           └── Header.tsx         # Shared header component
```

## Features

| Feature | Status | Route | README |
|---------|--------|-------|--------|
| AI Chat | Live | `/chat` | [features/chat/README.md](ui/src/features/chat/README.md) |
| Kanban Planner | Design complete | `/kanban` | [features/kanban/README.md](ui/src/features/kanban/README.md) |

## Coding Conventions

- Extract shared helper functions into `utils/` directories within the relevant feature folder (e.g., `features/kanban/utils/dateUtils.ts`). Never duplicate utility functions across files.
- Always reference enums via their named constant (e.g., `TaskType.WEEKLY`) instead of raw strings (`"WEEKLY"`).
- Use `switch/case/default` instead of `if/else if` when branching on enum values.
- Prefer batch operations (e.g., `createMany`, `updateMany`) over loops with individual database calls unless unavoidable.
- Extract large chunks of UI JSX into separate components to improve readability and modularity.
- Use Heroicons as JSX imports (e.g., `<PlusIcon />`) instead of inline SVG.

## Commands

```bash
cd ui && npm run dev      # Start dev server
cd ui && npm run build    # Production build
npx prisma studio         # Open Prisma database GUI
npx prisma migrate dev    # Run database migrations
npx prisma generate       # Regenerate Prisma client
```
