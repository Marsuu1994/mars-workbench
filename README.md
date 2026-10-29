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
- **Tests**: `npm test` runs the unit and integration tests (it needs a local Postgres: the stack, or `TEST_DATABASE_URL`), `npm run test:e2e` the Playwright suite as a separate e2e user, reusing a running dev server. Conventions in [test/README.md](./test/README.md).
- **Production**: its credentials live only in `.env.prod`. Once a migration is merged, `npm run db:deploy:prod` applies it.

## Docs

- [design/](./design/README.md) — centralized design docs:
  - [baseline](./design/baseline.md) — goal, entities, schema, decisions
  - [tracker](./design/tracker.md) — open ideas/todos
  - [reference](./design/reference.md) — actions/services/DAL inventory
  - [flows/](./design/flows) — per-page flow docs
  - [mockup/](./design/mockup) — mockups of designs not yet fully implemented
- Implemented UI is documented in-app at `/design` — layer-tabbed component gallery + per-feature scenario pages
- This README holds the app-wide **Current State**; what changed and when lives in the git history and PR descriptions

## Current State

What the product does today, page by page — a skimmable tour, 1–2 lines per bullet.

### Design System

- **"Mission Control HUD"** (`design/design-language/` — `mars-dark.md` / `mars-light.md` + shared skeleton in its README): two custom daisyUI themes — `mars-dark` (default, night ops deck) / `mars-light` ("dawn on Mars" — warm sand, not white) — on seven OKLCH hues with verified contrast, plus the token-derived `fx-*` utility layer (cosmic shell, console chips, status LEDs, telemetry type, glow CTAs). Palette changes must follow the sync points listed in the design doc. All themes declare one shared variable contract (`npm run check:themes`, CI) and a page carries a single theme scope on `<html>`
- **Design Console** (`/design`): component gallery tabbed by layer (Tokens & FX · UI · Application · Domain) plus per-feature scenario pages (`/design/scenarios`: board, priorities, plan, projects, dump, auth) rendering the same screen components as the live pages with fixture states (interaction states reached by scripted clicks, never by scenario-only props) — the source of truth for implemented UI, structurally unable to drift from production; designs not yet fully implemented are mocked up in `design/mockup/`
- **`p5-dark` ("P5 dark")**: third theme, **full Calling Card skin** — flat-depth geometry fork (halftone shell, sticker cards, hazard targets, parallelogram chips, diamond LEDs, white-flip nav, pop-shadow CTAs with the paper/ink hover flip), Anton display voice on fixed chrome labels, and five opt-in utilities (`fx-display/tile/cut/slash/burst`). Spec `design/design-language/p5-dark.md`

### Board

- Two-column kanban (Todo · Done; work in progress stays in Todo): drag-and-drop with optimistic UI, fibonacci task sizing (XS–XL), per-column accents
- **Kind-first cards**: each card opens with its kind — habit, project step or one-off — in a fixed colour, then its context (a habit's plan line, a step's project and number of N, a one-off's quadrant); a neutral size closes the card. A habit's week dots and a step's project path show where the card sits, its own mark outlined. Risk is switched off until per-kind rules return
- **Missed days expire**: a habit instance not done by the end of its day expires and stays an empty dot
- **Backlog** stages template-generated instances and this week's project steps, and pulls them onto the board — right-edge drag panel on desktop, bottom sheet on mobile (from a peeking "Backlog" pill); backlog tasks count toward the week projection, not Today. On desktop only the open side takes keyboard and screen-reader focus, and focus follows the toggle
- **Progress dashboard**: Today ring, stat metrics, Week Progress bar
- One-off (`AD_HOC`) tasks are created on the priority matrix (or by Claude) and reach the board via Track This Week (or Claude's plan tools)
- **Sync** (`syncService.ensureSynced`): daily + end-of-period sync awaited by every kanban page — idempotent, page-visit order never matters
- **Refresh, every page**: each write re-renders the page from the server (the board loads in two database round trips); a page visited in the last minute comes back instantly from the client cache; quick optimistic edits never flash back, and form modals close onto the updated list. No client cache library (`design/spike/archived/mutation-layer.md`)
- Empty board states for new users ("No active plan") vs returning users (last-period recap with stats); installable PWA

### Projects

- **Projects page** (`/kanban/projects`, its own sidebar item and dock tab): a project is a goal plus an ordered path of steps that never expire — the list with progress and next step beside the selected project's path (one or the other on mobile; `?project=` keeps the selection); create, edit and archive projects and add, edit, delete and reorder steps
- **+ This week** puts a step in the board's backlog (× takes it back); a project with every step done offers a one-click Archive

### Plan

- Create/edit plans with inline per-template type/frequency config, Plan Mode (NORMAL/EXTREME), and a review-changes diff before committing edits; templates are reusable and preselected from the previous plan, and last week's unfinished one-offs and project steps carry over unless deselected (a step goes back to its project)
- Fully mobile-adapted: bottom-sheet modals, docked summary/submit footer
- **Plan with Claude (MCP)**: add Mars Workbench to Claude as a custom connector (`/api/mcp`, named e.g. "Mars Workbench – weekly planner"; sign-in and consent through Supabase's OAuth server). Claude reads the planning guide and your week, recaps it, asks what to keep or change, then writes plans, habits and projects (whole paths, steps onto the week) once you agree. It also keeps your one-offs: reads the matrix, adds tasks in batches of up to 20, marks them done (credited like the matrix's Done), moves them between quadrants, and puts the ones you pick on this week (into your to-do, like Track This Week) when it creates or updates the plan

### Priorities

- Full-page 2×2 Eisenhower matrix (`/kanban/priorities`) organizing all non-done one-off tasks by quadrant; drag between quadrants to reprioritize (optimistic + rollback)
- **Move to** chooser on every card (desktop popover / mobile bottom sheet): **Track This Week** pulls the task into the board's Todo; **Done** completes it in place — credited to the active plan when there is one, a plain status change otherwise; no confirm — a 5 s undo toast with a countdown bar instead
- **Add Priority Task** creates unassigned matrix tasks — the matrix and Claude (MCP) are the only one-off entry points. Deselected one-offs return to the pool; DONE tasks keep their plan attribution
- No active plan (incl. the stale-plan window after week rollover) → warning bar with a Create Plan link; the chooser's Todo row disables, Done still works

### Dump

- Friction-free brain dump (`/kanban/dump`, sidebar item + 5th mobile dock tab) — zero-decision plain-text capture (auto-growing IME-safe composer, ⌘/Ctrl+Enter to dump) above a day-grouped, newest-first feed with cursor-based infinite scroll and a 6-line clamp. Storage-only V1 (a dormant `isProcessed` flag reserves future LLM batch processing); append-only, opaque-cursor keyset pagination. Design in `design/flows/dump.md`

### Auth

- Supabase Auth (Google OAuth) with route protection (sign-in returns to the page that asked for it; the session token is verified locally, once per request), themed login page, collapsible workspace sidebar (Board / Priorities / Projects / Plan / Dump) and 6-tab mobile dock. **Settings is a responsive overlay** (dock tab / sidebar user row → same sheet): theme picker (Sora light / Sora dark / P5 dark, cookie-persisted, explicit choice — no time-based auto-switch) + two-step confirm sign-out. Deployed on Vercel
- **OAuth consent page** (`/oauth/consent`): where Supabase's OAuth server sends you to approve or deny an MCP client (Claude) — who's asking, the approving account, what it can do, and where the browser returns

Open items: see [design/tracker.md](./design/tracker.md).
