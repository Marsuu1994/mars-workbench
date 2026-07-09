# Mars Workbench Agent Guide (Shared)

This document is the common rulebook for all AI agents working in this repository.

## Scope

- Apply these rules to all agent sessions unless a tool-specific addendum says otherwise.
- Use [CLAUDE.md](./CLAUDE.md) only for Claude Code-specific behavior (skills and slash workflows).

## Project Overview

A Next.js application centered on a Kanban Period Planner, with AI-assisted plan creation. Deployed on Vercel.

## Tech Stack

- Framework: Next.js 16 (App Router)
- UI: React 19, Tailwind CSS 4, daisyUI 5 (custom `mars-dark` / `mars-light` themes + `fx-*` FX utility layer — see `design/design-system.md` "Mission Control HUD")
- State: Zustand
- Database: PostgreSQL (Supabase) + Prisma ORM
- Auth: Supabase Auth (Google OAuth)
- LLM: OpenAI (`gpt-5-nano`) for AI-assisted plan creation — non-streaming structured output (`zodResponseFormat`)
- Icons: Heroicons
- Language: TypeScript

## Project Structure

Directory responsibilities only — for concrete file/component names, read the code. Keep this tree about *where things go*, not an inventory.

```text
public/                            # PWA manifest, service worker, icons
prisma/                            # schema.prisma + migrations/
scripts/one-time/                  # Ad-hoc/manual scripts (see One-Time Scripts section)
design/                            # Centralized design docs (see design/README.md for the index)
├── baseline.md                    # The ONE app-wide baseline (goal, entities, schema, decisions)
├── design-system.md               # Visual design system: OKLCH palette + contrast, fx-* layer
├── tracker.md                     # Consolidated roadmap — open items only
├── reference.md                   # Lean lookup tables: server actions, services, DAL
├── flows/                         # Per-feature flow docs
└── mockup/                        # HTML mockups grouped by feature + shared styles.css / mockup-theme.css
src/
├── proxy.ts                       # Route protection (Supabase session check)
├── app/                           # App Router: auth/, kanban/ (board, plans, priorities, settings),
│                                  #   design/ (dev gallery), layout.tsx, globals.css
├── generated/prisma/              # Generated Prisma client (gitignored)
├── actions/                       # ALL server actions ('use server') — thin validate → service → revalidate
├── services/                      # ALL business logic (no 'use server'); syncService.ensureSynced entry point
├── store/                         # Zustand stores, one per domain
├── hooks/                         # Store ↔ server-action bridges
├── prompt/                        # LLM prompt builders — never translated
├── types/                         # Shared domain types
├── utils/                         # Domain helpers (client-safe) — except statsUtils.ts (server-only)
├── schemas.ts                     # All zod schemas
├── lib/                           # Infrastructure only: prisma/, llm/, supabase/, auth/, db/ (DAL)
└── components/                    # Three top-level layers (see "Component Placement")
    ├── ui/                        # Design-system primitives only — zero domain imports
    ├── application/               # App frame + providers (shell, tab bar, sidebar, contexts)
    └── domain/                    # All business components — shared/ + one folder per feature
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

When adding a new convention, append it to the **end of the relevant subsection below** (not the middle), with concrete bad/good examples.

### General

- Keep domain helpers in `src/utils/`. Do not duplicate logic.
- Keep file names aligned with component names when renaming.

### Enums

- Always use enum constants (for example `TaskType.WEEKLY`), not raw strings.
- Prefer `switch/case/default` for enum branching.

### Database queries

- Prefer batch DB operations (`createMany`, `updateMany`) over per-row loops when possible.
- Prefer one broad query + in-memory filtering for small/moderate datasets.
- Use targeted DAL queries or DB aggregates for high-cardinality or known hotspots.
- For ACID-critical multi-step writes, use `prisma.$transaction()` with `tx?: Prisma.TransactionClient` in DAL writes.

### Icons & tokens

- Use Heroicons JSX imports, not inline SVG.
- Use `text-warning` for star/points icons.

### JSX & components

- Split very large JSX components into focused sub-components.
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

- **DRY repeated JSX blocks.** When the same markup repeats with only data/color differences (list rows, change sections, cards), extract ONE parameterized sub-component instead of copy-pasting the block per case. If the only difference is a semantic color, drive it from a `Record<Key, string>` of literal Tailwind classes. Bad: five near-identical `added`/`removed`/`modified` sections each hand-writing the same dot + title + meta + note row. Good:

  ```tsx
  // Literal classes only — never interpolate `bg-${accent}`, Tailwind can't see it.
  const ACCENT: Record<Accent, {dot: string; border: string}> = {
    success: {dot: "bg-success", border: "border-success/30"},
    error: {dot: "bg-error", border: "border-error/30"},
    warning: {dot: "bg-warning", border: "border-warning/30"},
  };
  const ChangeRow = ({accent, title, children}: ChangeRowProps) => (
    <div className={`… border ${ACCENT[accent].border}`}>
      <div className={`size-[7px] rounded-full ${ACCENT[accent].dot} …`} />
      <div>
        <div className="text-sm font-medium">{title}</div>
        {children}
      </div>
    </div>
  );
  ```

- **Don't inline long render functions as prop values.** A render-prop or option-label callback longer than a couple of lines belongs in a named function (or a `const` element list), not inlined at the call site — the call site should read as an outline. Bad: a `ChoicePills options={[{value, label: selected => (<>…12 lines…</>)}, …]}` with the whole label body inlined. Good:

  ```tsx
  const renderModeOption = (mode: PlanMode) => (selected: boolean) => ( /* … */ );
  <ChoicePills options={MODES.map(m => ({value: m, label: renderModeOption(m)}))} />
  ```

- **DRY applies to type shapes too, not just JSX.** Identical `interface`/`type` definitions must collapse to one; shapes that share a common core extend a base instead of re-listing the shared fields. Bad: `AddedTemplate` and `RemovedTemplate` declared as byte-for-byte identical interfaces, and `ModifiedTemplate` re-listing the same `templateId`/`title`. Good:

  ```ts
  interface TemplateRef {
    templateId: string;
    title: string;
  }
  // added & removed share one shape…
  interface TemplateChange extends TemplateRef {
    size: TaskSize;
    points: number;
    type: TaskType;
    frequency: number;
  }
  // …and the diverging one still reuses the shared core.
  interface ModifiedTemplate extends TemplateRef {
    fromType: TaskType;
    toType: TaskType;
  }
  ```

- **Component placement** — `src/components/` has exactly three top-level layers; place a new component by asking two questions in order. (1) Does it import a domain type/enum (`TaskType`, `TaskSize`, `RiskLevel`, a schema, a DAL row)? If yes it is a **domain** component → `domain/`; if it is reused by ≥2 features put it in `domain/shared/`, otherwise in that feature's `domain/<feature>/`. (2) If it imports no domain type: is it the app frame rendered once (shell, tab bar, sidebar) or a Provider/context? → `application/`. Everything else — a generic, domain-agnostic primitive reusable in any app — → `ui/`. The hard rule: **nothing in `ui/` may import a domain type** (that is exactly why `SizeChip`/`TaskTypeBadge`/`RiskBadge`/`RolloverTag`/`riskBorder` live in `domain/shared/`, while the pure `#n` `InstanceBadge` stays in `ui/`). Bad: a `WeeklyPointsChip` that imports `TaskType` dropped into `ui/`. Good: the same chip in `domain/shared/`, importing the generic `Pill` from `ui/`.

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

Only patterns not already covered above. DRY, enum constants, and the component→service/DAL boundary live in **Coding Conventions** / **Layers** — they are not repeated here.

- No inline styles; use Tailwind utility classes.
- No hardcoded color tokens like `text-yellow-400`; prefer semantic daisyUI tokens.
- No leftover `console.log` in committed code.
- No redundant actions/routes when existing handlers can be extended.
- Never modify past Update Log entries in README files. Update logs are append-only history.

## Version Control

- **Local sessions (running on the user's machine): do NOT commit or push without explicit permission from the user.** The user reviews work before it is committed. Make and stage changes, summarize what changed, and wait for the user to approve before running `git commit`, `git push`, or any other outward-facing or hard-to-reverse VCS action.
- **Remote sessions (managed cloud environments — e.g. Claude Code on the web / GitHub integration, where the repo is cloned fresh into an ephemeral container): no permission needed for commit/push/PR.** Work on a new branch (or the session's designated working branch), commit with clear messages, push with `git push -u origin <branch>`, and open a pull request directly.
- In both modes, never commit or push directly to `main` — changes land via pull requests.
- Run `npm run format` before pushing (see **Formatting** — CI's `format:check` fails the PR otherwise).

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
