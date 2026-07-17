# Mars Workbench Agent Guide (Shared)

This document is the common rulebook for all AI agents working in this repository.

## Scope

- Apply these rules to all agent sessions unless a tool-specific addendum says otherwise.
- Use [CLAUDE.md](./CLAUDE.md) only for Claude Code-specific behavior (skills and slash workflows).

## Project Overview

A Next.js application centered on a Kanban Period Planner, with AI-assisted plan creation. Deployed on Vercel.

## Tech Stack

- Framework: Next.js 16 (App Router)
- UI: React 19, Tailwind CSS 4, daisyUI 5 (custom themes + `fx-*` FX utility layer — see `design/design-language/`: `mars-dark` / `mars-light` shipped, `p5-dark` pending)
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
├── design-language/               # Per-theme visual specs (mars-dark, mars-light, p5-dark) + shared fx-* skeleton (README)
├── tracker.md                     # Consolidated roadmap — open items only
├── reference.md                   # Lean lookup tables: server actions, services, DAL
├── flows/                         # Per-feature flow docs
└── mockup/future-work/            # Self-contained HTML explorations of unbuilt designs only
src/
├── proxy.ts                       # Route protection (Supabase session check)
├── app/                           # App Router: auth/, kanban/ (board, plans, priorities, settings),
│                                  #   design/ (Design Console: layer-tabbed gallery + scenarios/),
│                                  #   layout.tsx, globals.css
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
└── components/                    # Three top-level layers (see "Component placement" in Layers)
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
- `src/app/design/scenarios/<feature>/`: flow-specific screen states (real components + fixtures)

## UI Workflow

### Source of Truth

Implemented UI is documented in-app by the Design Console (`/design`): a component gallery tabbed by layer (`ui/` · `application/` · `domain/`) and per-feature **scenario pages** (`/design/scenarios/<feature>/`) rendering the real components with pinned fixture states.

- **Screen components, not copied chrome**: each page's presentational layout is a screen-layer component in `domain/<feature>/` (`BoardScreen`, `PrioritiesScreen`, `PlanChrome`); the route renders it after data fetching, its scenario renders it with fixtures — pages and scenarios cannot drift. New pages follow this split.
- **Frame modes**: `fill` (default) is for screen-level tabs only — a 1:1 viewport-bounded stand-in for the page inside AppShell's `<main>`. Everything standalone (empty states, sheets, inline modal panels) is `fit` — content height + padding — and/or `overlay` for a dimmed modal backdrop.
- **Live-feel, no side effects**: frames wrap content in an `InteractionShield` — hover and scroll stay live; clicks/submits/drag-starts are swallowed so wired handlers can never fire against fixture ids.
- **Modals render inline** via their extracted `*Panel`/`*Content` components (the live `OverlayShell` top-layer dialog would escape the frame's clipping).

### Designing New UI

Future or unapproved designs are explored as **self-contained** HTML mockups (no shared CSS) in `design/mockup/future-work/` — see `/design-explore`. Get user approval on the exploration before code changes.

### Implementing UI

Implement the approved exploration exactly (layout, spacing, text, colors, icons, states); raise blockers and update the exploration first if something can't be built as-is. After the UI lands: add or extend the feature's scenario page (and gallery entries for new reusable components), then delete the exploration mockup — the scenario page takes over as source of truth.

### Keeping Scenarios in Sync

After completing a UI task, update the affected scenario/gallery fixtures so the pinned states match the shipped UI (new states, changed copy, new badges). A scenario that no longer matches production is a bug.

## Documentation Style

The living docs — README **Current State**, `design/tracker.md`, and everything under `design/` — are read by the human owner to re-orient; they are **not the agent's work record**. Write them as "what the product is now / what's still open", never as "everything that was done". Completeness has two sanctioned homes — the append-only README **Update Log** and PR descriptions — so nothing is lost by keeping living docs lean: omitted detail stays recoverable in git; buried signal is gone.

- **Write at the doc's altitude, not the work's.** Every doc has a declared altitude — `tracker.md`: open items, 1–2 lines each; `reference.md`: lean lookup tables; `baseline.md`: entities + decisions; `flows/`: step contracts; README Current State: product capabilities (a skimmable tour, 1–2 lines per bullet). Implementation inventory (file/component/key names, sub-change lists) lives in the code, the diff, and `reference.md` — not in living-doc prose. Bad: a tracker item kept checked `[x]` with a phase-by-phase inventory of every component that landed. Good: the finished work summarized in one Update Log entry; only the open follow-ups remain in the tracker.
- **Length must not scale with diff size.** A bigger change earns a *higher-level* summary, not a longer one — a Current State bullet stays 1–2 lines even as the feature behind it grows.
- **Edit living docs in place; don't append.** Rewrite the sentence that is now wrong instead of adding a paragraph; an edit keeps the doc's size roughly flat.
- **Update Log is the pressure valve**: append-only (see Anti-Patterns) and detail-tolerated — record the day's work at whatever length it needs, just lead each bullet with the outcome rather than the operation.

## Layers

- Actions (`src/actions/`): `'use server'`, thin layer (validate with Zod -> call service -> `revalidatePath`)
- Services (`src/services/`): business logic, no `'use server'`. `syncService.ensureSynced` is the single sync entry point awaited by every kanban page.
- DAL (`src/lib/db/`): all Prisma queries
- If an action requires multiple DAL calls or conditional orchestration, extract to service.
- Server-only modules — everything in `src/services/` plus `src/utils/statsUtils.ts` (imports the generated Prisma client) — must never be imported from `'use client'` code. `src/utils/` is otherwise client-safe (`enums`, `dateUtils`, `sizeUtils`, …), as is `src/schemas.ts`.
- Components in `src/components/` may invoke server actions directly (e.g. the shared `TaskModal` calls `templateActions` and `createAdhocTaskAction`) — server actions behave like endpoints, this is not a layering violation. Direct service/DAL imports from components remain forbidden.
- **Component placement** — `src/components/` has three layers, decided by imports (checked in order): a component that imports a domain type/enum/schema/DAL row is **domain** → `domain/<feature>/`, or `domain/shared/` when reused by ≥2 features; the once-rendered app frame (shell, tab bar, sidebar) and providers are **application**; everything else — generic primitives reusable in any app — is **ui**. Hard rule: nothing in `ui/` may import a domain type. Bad: a `WeeklyPointsChip` importing `TaskType` dropped into `ui/`. Good: the same chip in `domain/shared/`, composing the generic `Pill` from `ui/`.

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

- **User-facing copy is sentence case** — capitalize only the first word (plus proper nouns/acronyms); Title Case is reserved for headers (page/section titles, nav labels). Applies to buttons, row actions, chips, hints, empty states — the same action must not flip casing between states. Bad: a rest-state button "Sign Out" whose confirm state reads "Sign out?". Good: "Sign out" / "Sign out?" / "Create task" / "Add task", with headers like "Settings" or "Kanban Planner" keeping their casing.

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
