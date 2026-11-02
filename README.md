# Mars Workbench

A kanban-first personal productivity app: a weekly period planner built around a drag-and-drop kanban board, an Eisenhower priority matrix, and weekly planning with Claude over MCP. Next.js + Supabase (Google OAuth) + Prisma, deployed on Vercel.

## Getting Started

Local development runs against a local Supabase stack — Postgres and Auth in Docker (OrbStack or Docker Desktop on a Mac) — never production.

```bash
npm run up   # .env.local, npm install, the stack (start, migrate, seed), then the dev server
```

One command from a fresh checkout and every day after: it skips what is already done (an up-to-date install, a running stack, applied migrations, existing seed data). Open [http://localhost:3000](http://localhost:3000).

- **Sign in with Google**: copy `supabase/.env.example` to `supabase/.env` and fill in the Google OAuth client's id and secret (its authorized redirect URIs include `http://127.0.0.1:54321/auth/v1/callback`), then `npm run db:stop && npm run db:setup`. To land on the seeded data, uncomment `SEED_EMAIL` in `.env.local` and set it to your Gmail, then `npm run db:reset` and sign in again. The reset also removes the separate, empty user an earlier Google sign-in created, and the seed prints the address it used.
- **Without Google** (scripts, agents, Playwright): `npm run dev:session` signs in as the seeded dev user and writes its cookies.
- **Day to day**: `npm run up`; `npm run db:stop` stops the stack (data kept), `npm run db:reset` wipes and reseeds, `npm run setup` does everything but the dev server. `npx prisma migrate dev` works against the stack.
- **Tests**: `npm test` runs the unit and integration tests (it needs a local Postgres: the stack, or `TEST_DATABASE_URL`), `npm run test:e2e` the Playwright suite — one spec per flow doc, each test as its own fresh user, at desktop and mobile width — reusing a running dev server (flows without an e2e test yet: `e2e/not-implemented.md`); `e2e/contract/` holds the contracts of designed UI not built yet. Conventions in [test/README.md](./test/README.md).
- **Production**: its credentials live only in `.env.prod`. Once a migration is merged, `npm run db:deploy:prod` applies it.

## Docs

- [design/](./design/README.md) — centralized design docs:
  - [baseline](./design/baseline.md) — goal, entities, schema, decisions
  - [tracker](./design/tracker.md) — open ideas/todos
  - [reference](./design/reference.md) — actions/services/DAL inventory
  - [flows/](./design/flows) — per-page flow docs
  - [mockup/](./design/mockup) — mockups of designs not yet fully implemented
- [experiments/](./experiments/README.md) — controlled comparisons of ways of working (agent workflows, models, tooling): one folder per question, an instruction and a report per try
- [reviews/](./reviews/README.md) — the owner's code reviews, one file per PR: what each comment caught and how it ended
- Implemented UI is documented in-app at `/design` — layer-tabbed component gallery + per-feature scenario pages
- This README holds the app-wide **Current State**; what changed and when lives in the git history and PR descriptions

### How docs are split (target state)

Every folder that has rules splits them by reader:

- `README.md` is for people: what the folder is for, how it is organized, where to start reading.
- `AGENTS.md` is for coding agents: the rules to follow and the templates to fill, short and checkable. A `CLAUDE.md` beside it holds `@AGENTS.md`, so Claude Code loads it too.
- The root `AGENTS.md` keeps only the rules every task needs, plus an index of the folders' `AGENTS.md`.

Today only `experiments/` and `reviews/` follow this; the other folders keep their rules in their README until they migrate (tracker › Harness engineering).

## Current State

What you can do in the app today, page by page. How it is built lives in [design/](./design/README.md).

### Board

- This week's tasks in two columns, Todo and Done. Drag a card to Done when you finish it.
- Each card shows what kind of work it is (a habit, a project step or a one-off), where it comes from, and its size.
- A habit not done on its day expires and stays on the card as a missed dot.
- The backlog holds the rest of this week's habits and project steps. Pull them onto the board when you are ready.
- The top of the page shows today's progress, a few stats and how far the week has come.
- With no plan, the board says so; once a week ends, it recaps how that week went.

### Projects

- A project is a goal with an ordered list of steps. Steps never expire.
- Create, edit and archive projects; add, edit, reorder and delete their steps.
- Send a step to this week's backlog, or take it back. A finished project offers to archive itself.

### Plan

- Set up the week: choose the habits, how often each one runs, and Normal or Extreme mode.
- Last week's habits come preselected, and unfinished one-offs and project steps carry over unless you drop them.
- Before you save changes to a plan, you see what is added, removed and changed.

### Plan with Claude

- Add the app to Claude as a custom connector (its `/api/mcp` address) and plan the week in conversation.
- Claude recaps last week, asks what to keep or change, then writes the plan, habits and projects once you agree.
- It also manages one-offs: adds them, moves them between quadrants, marks them done and puts them on this week.

### Priorities

- One-off tasks sorted into the four quadrants of an Eisenhower matrix. Drag a card to another quadrant to reprioritize it.
- From any card, track it this week (it lands in the board's Todo) or mark it done, with a few seconds to undo.
- New one-offs start here or come from Claude. Without an active plan you can still add and finish them, but not track them.

### Dump

- Write down whatever is on your mind without sorting it. Entries are grouped by day, newest first.
- For now it only keeps them; nothing processes them yet.

### Sign-in and settings

- Sign in with Google. The sidebar on desktop and the tab bar on mobile reach every page.
- Settings has the theme (Sora light, Sora dark or P5 dark) and sign out.
- Works on phones and installs as an app.
- When Claude connects, a consent page shows what it is asking for and lets you approve or deny it.

Open items: see [design/tracker.md](./design/tracker.md).
