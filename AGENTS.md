# Mars Workbench Agent Guide (Shared)

This document is the common rulebook for all AI agents working in this repository.

## Scope

- Apply these rules to all agent sessions unless a tool-specific addendum says otherwise.
- Use [CLAUDE.md](./CLAUDE.md) only for Claude Code-specific behavior (skills and slash workflows).

## Project Overview

A Next.js application centered on a Kanban Period Planner, with AI-assisted plan creation. Deployed on Vercel.

## Tech Stack

- Framework: Next.js 16 (App Router)
- UI: React 19, Tailwind CSS 4, daisyUI 5 (custom `mars-dark` / `mars-light` themes)
- State: Zustand
- Database: PostgreSQL (Supabase) + Prisma ORM
- Auth: Supabase Auth (Google OAuth)
- LLM: OpenAI (`gpt-5-nano`) for AI-assisted plan creation — non-streaming structured output (`zodResponseFormat`)
- Icons: Heroicons
- Language: TypeScript

## Project Structure

```text
public/
├── manifest.json                  # PWA web app manifest
├── sw.js                          # Minimal service worker (PWA install criteria)
└── icons/                         # PWA icons (192, 512, maskable, apple-touch)
prisma/
├── schema.prisma                  # Database schema
└── migrations/                    # Database migrations
scripts/
└── one-time/                      # Ad-hoc/manual scripts (see One-Time Scripts section)
design/                            # Centralized design docs (see design/README.md)
├── README.md                      # Index of what lives where
├── baseline.md                    # The ONE app-wide baseline (goal, entities, schema, decisions)
├── tracker.md                     # Consolidated roadmap — open items only
├── reference.md                   # Lean lookup tables: server actions, services, DAL
├── flows/                         # Per-feature flow docs (shared, board, plan, priorities, auth)
└── mockup/                        # HTML mockups grouped by feature + shared styles.css / mockup-theme.css
    ├── board/                     # Board + backlog drawer mockups (desktop + mobile)
    ├── plan/                      # Plan form, AI chat, review changes
    ├── priorities/                # Priority matrix
    ├── auth/                      # Login, sidebar, settings
    ├── shared/                    # Cross-feature UI (task modal)
    └── future-work/               # Approved-but-not-implemented redesigns
src/
├── proxy.ts                       # Route protection (Supabase session check)
├── app/
│   ├── auth/
│   │   ├── callback/route.ts      # OAuth callback (code → session exchange)
│   │   └── login/page.tsx         # Login page (Google OAuth sign-in)
│   ├── kanban/                    # Kanban pages
│   │   ├── page.tsx               # Board page
│   │   ├── plans/                 # Plan create/edit pages ([id], new)
│   │   ├── priorities/            # Eisenhower priority matrix page
│   │   └── settings/              # Settings page
│   ├── design/                    # Component gallery (dev) — chromeless /design route
│   ├── layout.tsx                 # Root layout (providers + AppShell wrapper)
│   └── globals.css                # Global styles
├── generated/prisma/              # Generated Prisma client (gitignored)
├── actions/                       # ALL server actions ('use server'): boardActions, taskActions,
│                                  #   planActions, templateActions, aiChatActions, matrixActions
├── services/                      # ALL business logic: boardService, planService, aiChatService,
│                                  #   matrixService, syncService (ensureSynced, React cache())
├── store/                         # Zustand stores: aiPlanChatStore, sidebarStore
├── hooks/                         # useAiPlanChat (store ↔ server-action bridge)
├── prompt/                        # LLM prompt builders (draftPlanPrompt) — never translated
├── types/                         # Shared domain types (aiChat.ts: stats + chat types)
├── utils/                         # Domain helpers: enums, dateUtils, sizeUtils, taskUtils,
│                                  #   aiChatContent, draftSummary, reconstructChat (client-safe)
│                                  #   + statsUtils (server-only — imports the generated Prisma client)
├── schemas.ts                     # All zod schemas (plan / template / task / matrix / AI chat)
├── lib/                           # Infrastructure only
│   ├── prisma.ts                  # Prisma client singleton (pooled connection)
│   ├── llm/                       # OpenAI client singleton + model constant
│   ├── supabase/                  # Supabase client utilities
│   │   ├── client.ts              # Browser client ('use client' components)
│   │   ├── server.ts              # Server client (Server Components, Actions)
│   │   └── middleware.ts          # Session refresh + redirect logic
│   ├── auth/                      # getCurrentUserId
│   └── db/                        # Data access layer (all Prisma queries)
└── components/                    # UI, grouped by page
    ├── common/                    # App shell chrome (AppShell, AppSidebar, BottomTabBar,
    │                              #   BreakpointProvider, ThemeProvider)
    ├── shared/                    # Cross-page UI (SizeChip, TaskTypeBadge, BoardHeader, task-modal/)
    ├── board/                     # /kanban — KanbanBoard, BoardColumn, TaskCard, backlog drawer, …
    ├── plan/                      # /kanban/plans/* — PlanForm, ReviewChangesModal, TemplateItem, ai-chat/
    ├── priorities/                # /kanban/priorities — PriorityMatrixPage, QuadrantCell, …
    └── auth/                      # SettingsContent (/kanban/settings)
```

## Workflow

### Session Start

Read design docs (repo-root `design/`) only when the task involves logic, data, or new flows. Skip for pure styling/copy/UI-only tweaks.

- `design/baseline.md`: schema or entity changes
- `design/flows/<feature>.md`: flow changes or additions
- `design/reference.md`: REST/server action/DAL changes
- `design/mockup/<feature>/mockup-[flow].html`: flow-specific UI mockups

## UI Workflow

### Initial Design for a Complex Feature

When creating mockups for a new feature with multiple flows/pages, split into separate files in `design/mockup/[feature]/`. The shared `styles.css` and `mockup-theme.css` live one level up at `design/mockup/`.

### Modify Existing UI Mockup

1. Create a temporary before/after HTML mockup for review. The "before" section exists only for side-by-side comparison to help the user decide.
2. Get user approval before code changes.
3. After approval, convert to source-of-truth: remove the "before" section (keep only the approved screens), strip before/after labels and navigator entries, and make the primary screen the default active view. Remove the temporary file if it was separate.

### Implementing UI Components

Implement approved mockups exactly (layout, spacing, text, colors, icons, states). If any part cannot be implemented as-is, raise blockers and update mockup first.

### Keeping Mockups in Sync

Mockups are the source of truth for UI, but implementation may introduce details not in the original mockup (e.g. cursor styles, hover states, text/icon changes). After completing a UI task, back-port any such details to the source-of-truth mockup as a final step so the mockup stays accurate.

## Layers

- Actions (`src/actions/`): `'use server'`, thin layer (validate with Zod -> call service -> `revalidatePath`)
- Services (`src/services/`): business logic, no `'use server'`. `syncService.ensureSynced` is the single sync entry point awaited by every kanban page.
- DAL (`src/lib/db/`): all Prisma queries
- If an action requires multiple DAL calls or conditional orchestration, extract to service.
- Server-only modules — everything in `src/services/` plus `src/utils/statsUtils.ts` (imports the generated Prisma client) — must never be imported from `'use client'` code. `src/utils/` is otherwise client-safe (`enums`, `dateUtils`, `sizeUtils`, …), as is `src/schemas.ts`.
- Components in `src/components/` may invoke server actions directly (e.g. the shared `TaskModal` calls `templateActions` and `createAdhocTaskAction`) — server actions behave like endpoints, this is not a layering violation. Direct service/DAL imports from components remain forbidden.

## Coding Conventions

- New entries must be appended at the end of this section, never inserted in the middle. Include concrete bad/good examples.
- Keep domain helpers in `src/utils/`. Do not duplicate logic.
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
- Extract conditional/complex JSX into named render functions (e.g. `renderBoardLink()`) within the component to keep the return statement scannable. Reserve sub-components for reusable pieces; use render functions for one-off blocks that need access to component scope.
- For modal/dialog-like components, split the structural regions (header, body, footer) into named render functions (or sub-components if reusable) so the top-level return reads as an outline. Bad: a single 120-line `return (<dialog>…</dialog>)` mixing header markup, a message loop, error markup, and footer branching. Good:

  ```tsx
  const renderHeader = () => ( /* … */ );
  const renderBody = () => ( /* … */ );
  const renderFooter = () => ( /* … */ );

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box …">
        {renderHeader()}
        {renderBody()}
        {renderFooter()}
      </div>
    </dialog>
  );
  ```

- Extract fixed, **non-user-facing** literals — routes/hrefs, magic numbers, thresholds, durations, style tokens, config values — into a dedicated `constants.ts` colocated with the component (or a feature `constants/` folder), `export` them, and import where used — no inline magic literals. (User-facing *copy* never lives here — see the i18n rule below.) Bad: `maxLength={280}` and `href="/kanban/plans/new"` inline in JSX. Good:

  ```ts
  // ai-chat/constants.ts
  export const MESSAGE_MAX_LENGTH = 280;
  export const CREATE_PLAN_HREF = "/kanban/plans/new";
  ```

  ```tsx
  import { MESSAGE_MAX_LENGTH, CREATE_PLAN_HREF } from "./constants";
  <textarea maxLength={MESSAGE_MAX_LENGTH} />
  <Link href={CREATE_PLAN_HREF} />
  ```

- All **user-facing copy** app-wide is internationalized with `next-intl` — it lives in `src/i18n/en.json` and is read via `useTranslations` (Client Components) or `getTranslations` (Server Components / Server Actions / `generateMetadata`). Add each string under a namespace; use ICU for plurals/interpolation, `Enums.*` keys for enum→label display, and `t.rich` when part of a string needs inline markup. Keep decorative glyphs/emoji and presentational symbols in the JSX, not in the message. Never translated: `prompt/*.ts` LLM instructions and internal `throw new Error(...)` messages. Bad: `export const TITLE = "Create Weekly Plan";` (copy in a `constants.ts`). Good:

  ```json
  // src/i18n/en.json
  { "Plan": { "createTitle": "Create Weekly Plan", "taskCount": "{count, plural, one {# task} other {# tasks}}" } }
  ```

  ```tsx
  const t = useTranslations("Plan");
  <h1>{t("createTitle")}</h1>
  <span>{t("taskCount", { count })}</span>
  ```

## Code Style

- Named exports only (except Next.js `page.tsx` and `layout.tsx` defaults).
- Components as `const` arrow functions.
- Explicitly typed props, prefer `interface`.
- No `any`; use proper types or `unknown`.
- Prefer async Server Components where no client interactivity is needed.
- Add `'use client'` only when required.

## Formatting (Prettier)

- All code formatting is handled by Prettier using Google's style (the `gts`
  config: single quotes, no bracket spacing, trailing commas, `arrow` parens
  avoided, 2-space indent, 80-col, semicolons). Config lives in
  `.prettierrc.json`; do not hand-tune spacing/quotes against it.
- Run `npm run format` before finishing a task so every agent leaves the same
  style. CI runs `npm run format:check` and fails on any unformatted file.
- Prettier is scoped to code (TS/TSX/JS/JSON/CSS). Markdown docs and `design/`
  assets are ignored (see `.prettierignore`) — the README Update Logs are
  append-only and must not be reflowed.
- ESLint is layered with `eslint-config-prettier`, so lint rules never fight
  Prettier; use ESLint for correctness, Prettier for formatting.

## API Conventions

- API handlers live in `app/api/[resource]/route.ts`.
- Return via `NextResponse.json()`.
- Use consistent error shape: `{ error: string }`.
- Validate/parse request body before DB layer.
- Do not import Prisma directly in route handlers; go through DAL.

## State Management (Zustand)

- One store per domain at `src/store/[domain]Store.ts` (e.g. `aiPlanChatStore`, `sidebarStore`).
- No direct DB/fetch calls inside stores; use hooks/actions as bridge.
- Keep state flat.
- Use slice pattern when store grows beyond about five actions.

## Database / Prisma

- Keep Prisma queries in `src/lib/db/`.
- Use focused `select` fields unless full model is required.
- Prefer measured indexing based on query plans (`EXPLAIN ANALYZE`), not speculative index growth.

## One-Time Scripts

- Put one-time / ad-hoc scripts (testing resets, data backfills, manual fixes) in `scripts/one-time/`.
- These are not part of the app build or migrations; they are run manually against the DB/env as needed.
- Make them safe to review: parameterize identifiers (e.g. email) at the top, wrap DB writes in a transaction, and include a sanity-check `SELECT` plus a `ROLLBACK` dry-run option before `COMMIT`.

## Anti-Patterns to Avoid

- No inline styles; use Tailwind utility classes.
- No hardcoded color tokens like `text-yellow-400`; prefer semantic daisyUI tokens.
- No leftover `console.log` in committed code.
- No duplicated logic.
- No raw string enum values.
- No redundant actions/routes when existing handlers can be extended.
- No direct service/DAL calls from UI components.
- Never modify past Update Log entries in README files. Update logs are append-only history.

## Version Control

- **Local sessions (running on the user's machine): do NOT commit or push without explicit permission from the user.** The user reviews work before it is committed. Make and stage changes, summarize what changed, and wait for the user to approve before running `git commit`, `git push`, or any other outward-facing or hard-to-reverse VCS action.
- **Remote sessions (managed cloud environments — e.g. Claude Code on the web / GitHub integration, where the repo is cloned fresh into an ephemeral container): no permission needed for commit/push/PR.** Work on a new branch (or the session's designated working branch), commit with clear messages, push with `git push -u origin <branch>`, and open a pull request directly.
- In both modes, never commit or push directly to `main` — changes land via pull requests.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Lint
npm run format       # Format all code with Prettier (Google style)
npm run format:check # Verify formatting (used in CI)
npx prisma studio
npx prisma migrate dev
npx prisma generate
```
