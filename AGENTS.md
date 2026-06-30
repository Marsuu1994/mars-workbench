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
src/
├── proxy.ts                       # Route protection (Supabase session check)
├── app/
│   ├── auth/
│   │   ├── callback/route.ts      # OAuth callback (code → session exchange)
│   │   └── login/page.tsx         # Login page (Google OAuth sign-in)
│   ├── kanban/                    # Kanban pages
│   │   ├── page.tsx               # Board page
│   │   └── plans/                 # Plan create/edit pages ([id], new)
│   ├── design/                    # Component gallery (dev) — chromeless /design route
│   ├── layout.tsx                 # Root layout (providers + AppShell wrapper)
│   └── globals.css                # Global styles
├── generated/prisma/              # Generated Prisma client (gitignored)
├── lib/                           # Shared utilities
│   ├── prisma.ts                  # Prisma client singleton (pooled connection)
│   ├── llm/                       # OpenAI client singleton + model constant
│   ├── supabase/                  # Supabase client utilities
│   │   ├── client.ts              # Browser client ('use client' components)
│   │   ├── server.ts              # Server client (Server Components, Actions)
│   │   └── middleware.ts          # Session refresh + redirect logic
│   └── db/                        # Data access layer
├── features/
│   ├── auth/                      # Auth feature (see features/auth/README.md)
│   └── kanban/                    # Kanban Planner feature (see features/kanban/README.md)
└── components/
    └── common/
        ├── AppShell.tsx             # Client shell wrapper; hides chrome on chromeless routes (/design)
        ├── AppSidebar.tsx           # Collapsible app sidebar (nav + sign-out)
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

1. Create a temporary before/after HTML mockup for review. The "before" section exists only for side-by-side comparison to help the user decide.
2. Get user approval before code changes.
3. After approval, convert to source-of-truth: remove the "before" section (keep only the approved screens), strip before/after labels and navigator entries, and make the primary screen the default active view. Remove the temporary file if it was separate.

### Implementing UI Components

Implement approved mockups exactly (layout, spacing, text, colors, icons, states). If any part cannot be implemented as-is, raise blockers and update mockup first.

### Keeping Mockups in Sync

Mockups are the source of truth for UI, but implementation may introduce details not in the original mockup (e.g. cursor styles, hover states, text/icon changes). After completing a UI task, back-port any such details to the source-of-truth mockup as a final step so the mockup stays accurate.

## Layers

- Actions (`features/[feature]/actions/`): `'use server'`, thin layer (validate with Zod -> call service -> `revalidatePath`)
- Services (`features/[feature]/services/`): business logic, no `'use server'`
- DAL (`src/lib/db/`): all Prisma queries
- If an action requires multiple DAL calls or conditional orchestration, extract to service.

## Coding Conventions

- New entries must be appended at the end of this section, never inserted in the middle. Include concrete bad/good examples.
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

- Extract user-facing literals (copy strings, and meaningful numbers/colors) into a dedicated `constants.ts` colocated with the component (or a feature `constants/` folder), `export` them, and import where used — no inline magic literals. Bad: `placeholder="Refine the plan — or create it below..."` and `maxLength={280}` inline in JSX. Good:

  ```ts
  // ai-chat/constants.ts
  export const PLACEHOLDER_REFINE = "Refine the plan — or create it below...";
  export const MESSAGE_MAX_LENGTH = 280;
  ```

  ```tsx
  import { PLACEHOLDER_REFINE, MESSAGE_MAX_LENGTH } from "./constants";
  <textarea placeholder={PLACEHOLDER_REFINE} maxLength={MESSAGE_MAX_LENGTH} />
  ```

- User-facing copy in the `kanban` feature is internationalized with `next-intl` — it lives in `src/i18n/en.json`, not a `constants.ts`. Add the string under a namespace and read it via `useTranslations` (Client Components) or `getTranslations` (Server Components / Server Actions / `generateMetadata`). Use ICU for plurals/interpolation, `Enums.*` keys for enum→label display, and `t.rich` when part of a string needs inline markup. The `constants.ts` rule above still applies to non-copy literals (routes, numeric/style constants) and to features not yet migrated; LLM prompt files (`prompt/*.ts`) and internal `throw new Error(...)` messages are never translated. Bad: `export const TITLE = "Create Weekly Plan";` in a `constants.ts`. Good:

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

- **Do NOT create a commit without explicit permission from the user.** The user reviews work before it is committed. Make and stage changes, summarize what changed, and wait for the user to approve before running `git commit`.
- The same applies to `git push` and any other outward-facing or hard-to-reverse VCS action — ask first.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Lint
npx prisma studio
npx prisma migrate dev
npx prisma generate
```
