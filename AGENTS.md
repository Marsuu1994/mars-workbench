# Mars Workbench Agent Guide

The shared rulebook every agent session loads (Claude Code imports it through `CLAUDE.md`; Codex reads it directly). It holds the rules every task needs, plus an index of where the rest live (Workflow › Where the rules live).

## Project Overview

A Next.js application centered on a Kanban Period Planner; AI planning goes through Claude over MCP. Deployed on Vercel.

## Tech Stack

- Framework: Next.js 16 (App Router), React Compiler on
- UI: React 19, Tailwind CSS 4, daisyUI 5 with custom themes and an `fx-*` utility layer (`design/design-language/`)
- i18n: next-intl
- State: Zustand
- Database: PostgreSQL (Supabase) + Prisma ORM
- Auth: Supabase Auth (Google OAuth); its OAuth 2.1 Server also authorizes MCP clients
- MCP: `mcp-handler` + `@modelcontextprotocol/server` (v2) — the remote endpoint at `/api/mcp`, where Claude reads planning context and writes plans
- Tests: Vitest (unit, and integration against a real Postgres) + Playwright (e2e on the local Supabase stack)
- Icons: Heroicons
- Language: TypeScript

## Project Structure

Directory responsibilities only — for concrete file and component names, read the code.

```text
public/                            # PWA manifest, service worker, icons
prisma/                            # schema.prisma + migrations/
supabase/                          # Local Supabase stack config (Postgres + Auth in Docker)
scripts/                           # Repo checks run in CI; the local stack's setup, seed, and dev and e2e sessions
test/                              # Test helpers and conventions (README); unit and integration tests sit next to their modules
e2e/                               # Playwright specs
.claude/agents/                    # Claude Code subagents: ui-verifier, test-writer, ci-fixer (Workflow › Subagents)
design/                            # Design docs — index in design/README.md
├── baseline.md                    # The one app-wide baseline: goal, entities, schema, architecture decisions
├── design-language/               # Per-theme visual specs + the shared fx-* skeleton
├── tracker.md                     # Roadmap — open items only
├── reference.md                   # Lookup tables: server actions, services, DAL
├── flows/                         # Per-feature flow docs
├── spike/                         # Spike docs for open questions; archived/ = implemented
└── mockup/                        # Self-contained HTML mockups of designs not yet fully implemented
src/
├── proxy.ts                       # Route protection (Supabase session check)
├── app/                           # App Router routes, api/mcp/ and its OAuth metadata, the Design Console (design/)
├── i18n/                          # next-intl request config + en.json (all user-facing copy)
├── generated/prisma/              # Generated Prisma client (gitignored)
├── actions/                       # ALL server actions ('use server')
├── services/                      # ALL business logic (no 'use server')
├── mcp/                           # MCP server, thin like actions/
│   ├── tools/                     #   one file per tool: schema + annotations → service
│   ├── prompts/                   #   LLM-facing text: server instructions, tool descriptions
│   └── middleware/                #   identity (auth) + result/error shaping (runTool)
├── store/                         # Zustand stores, one per domain
├── hooks/                         # Store ↔ server-action bridges
├── types/                         # Shared domain types
├── utils/                         # Domain helpers (client-safe, except statsUtils.ts)
├── schemas.ts                     # All zod schemas
├── lib/                           # Infrastructure only: prisma.ts, supabase/, auth/, db/ (DAL)
└── components/                    # Three layers (see Layers › Component placement)
    ├── ui/                        # Design-system primitives only — zero domain imports
    ├── application/               # App frame + providers (shell, tab bar, sidebar, contexts)
    └── domain/                    # All business components — shared/ + one folder per feature
```

## Workflow

### Session start

Read the design docs only when the task involves logic, data or new flows; skip them for pure styling, copy or UI-only tweaks.

- `design/baseline.md`: schema or entity changes
- `design/flows/<feature>.md`: flow changes or additions
- `design/reference.md`: server action, service or DAL changes
- `src/app/design/scenarios/<feature>/`: the feature's screen states

Next.js APIs outrun training data: before using a routing, caching, server-action or `next.config` API you haven't checked for this version, read its page in `node_modules/next/dist/docs/`, the docs of the installed version.

A fresh checkout runs `npm run setup` (`.env.local` from `.env.example`, `npm install`, then the local Supabase stack with migrations and seed — starting Docker first in a cloud container); a task that needs neither the database nor a signed-in page runs `npm run setup -- --no-db` instead. `npm run dev:session` signs in as the seeded dev user without Google.

### Where the rules live

A rule that only one kind of file needs lives with that file. Read it before you edit:

| Before you edit… | Read first |
| --- | --- |
| a test (`*.test.ts`, `*.int.test.ts`, `e2e/`, `test/`) | `test/README.md` |
| a spike (`design/spike/`) | `design/spike/README.md` |
| `design/tracker.md` | its Conventions section |
| a flow doc (`design/flows/`) | `design/flows/README.md` |
| the Design Console — scenarios, gallery (`src/app/design/`) | `src/app/design/README.md` |
| a mockup (`design/mockup/`) | `design/README.md` |
| themes, `globals.css`, visual patterns | `design/design-language/README.md` |
| how a page's data flows from server to client | `design/baseline.md` › Architecture Decision |

### Adding a rule

A new rule goes where it belongs: a rule for one kind of file goes into that file's README or Conventions section; a rule a linter or script can check goes into the tool, with at most one line here; a rule that overlaps an existing one rewrites that rule instead of adding a second. Only rules every task needs live in this file.

### Spike first for complex tasks

A complex task — several PRs, a data-model change, a new tool surface, or a choice with real tradeoffs — starts with a spike in `design/spike/`, not code. Lifecycle and shape: `design/spike/README.md`.

### Subagents

Delegate to a subagent only work whose tool output would outgrow the brief and the report: it starts cold, takes longer and saves no tokens, so it pays off only in main-session context (measured in `design/spike/archived/subagent-delegation-pilot.md`). Each agent's description says what its brief needs.

- `ui-verifier`: the browser check (UI Workflow).
- `test-writer`: an e2e test, or a test in a layer the session hasn't read yet; a unit test next to a module you just read, write yourself.
- `ci-fixer`: CI red on GitHub, with the failing job's URL; green checks and few-line local failures, run yourself.

## UI Workflow

- **The Design Console is the source of truth for implemented UI.** `/design` renders the real components: a gallery tabbed by layer (`ui/` · `application/` · `domain/`) and per-feature scenario pages (`/design/scenarios/<feature>/`) with pinned fixture states. `npm run dev` serves it without signing in (`src/app/design/README.md` › Local access).
- **Verification is CI's and the owner's; a browser check is the exception.** CI runs the unit, integration and e2e tests — every page, every Design Console tab, the key journeys — on every PR, and the owner accepts UI on the Vercel preview. Logic, data and MCP changes are verified by `npm test`, style and copy changes by CI and the owner. A layout change (wrapping, overflow, breakpoints, overlay stacking), a new or changed scenario tab or play step, or the owner's request gets one browser check, delegated to the `ui-verifier` subagent with a brief — what changed, the scenario tabs, each check as a sentence — so screenshots and scripts stay out of the main context; read its verdict, and open a screenshot only when it says UNSURE. A bug seen only on a device (iOS / WebKit, the PWA): ask the owner for a screenshot or recording before trying headless Chromium.
- **Production first, the console adapts.** Components are shaped by what production needs. A production component never carries a prop, branch or comment that only the console uses, and nothing is split or restructured so the console can show it: the console reaches a state the way a user would, or skips it. Bad: `initialUndoToastTaskId` on `PrioritiesPage`. Good: a scenario tab's `play` step clicking the real control.
- **New UI starts as a mockup.** A design that isn't built yet is drawn as a self-contained HTML mockup in `design/mockup/`; get the owner's approval before code changes.
- **Build it exactly, then sync the console.** Implement the approved mockup exactly (layout, spacing, text, colors, icons, states); if something can't be built as-is, raise it and update the mockup first. As the UI lands, add or update the feature's scenario page and gallery entries so the pinned states match production. Once the design is fully implemented, delete its mockup: from then on the Design Console is the source of truth. A scenario that no longer matches production is a bug.

## Documentation Style

- **Living docs are for the owner to re-orient, not the agent's work record.** README Current State, `design/tracker.md` and everything under `design/` say what the product is now and what's still open. Write at the doc's altitude (each doc states it at its top); length doesn't scale with diff size — a bigger change earns a higher-level summary, not a longer one; rewrite the sentence that is now wrong instead of appending a paragraph. Implementation inventory (file, component and key names, sub-change lists) lives in the code, the diff and `reference.md`; completeness lives in PR descriptions and the Update Log.
- **The README Update Log is kept per day.** Earlier days' sections are never edited. On the current day, add the new entry, then rewrite the day's section into one summary of the day's work. Detail is welcome there; lead each bullet with the outcome, not the operation.

## Layers

- **Actions** (`src/actions/`): `'use server'`, thin — validate with Zod → call a service → `revalidatePath`. **MCP tools** (`src/mcp/tools/`) have the same shape: validate → service, wrapped by `runTool`. Pages and layouts read through actions too — never a service, the DAL or an auth helper — so the action is the one layer between UI and server (ESLint).
- **Services** (`src/services/`): all business logic, no `'use server'`; an action that needs several DAL calls or conditional orchestration moves it into a service. `syncService.ensureSynced` is the single sync entry point every kanban page awaits.
- **DAL** (`src/lib/db/`): all Prisma queries — nothing else imports Prisma. Route handlers stay thin: they hand off to `src/mcp/` or infrastructure in `src/lib/`, with no business logic or queries of their own.
- **Server-only modules** — `src/services/`, the DAL, the Prisma clients and `src/utils/statsUtils.ts` — never reach `'use client'` code (ESLint checks components, hooks and stores; `import type` is fine). The rest of `src/utils/` and `src/schemas.ts` are client-safe. Components may call server actions directly: actions behave like endpoints.
- **Component placement** — `src/components/` has three layers, decided by imports (checked in order): a component that imports a domain type/enum/schema/DAL row is **domain** → `domain/<feature>/`, or `domain/shared/` when reused by ≥2 features; the once-rendered app frame (shell, tab bar, sidebar) and providers are **application**; everything else — generic primitives reusable in any app — is **ui**. Hard rule: nothing in `ui/` imports a domain type. Bad: a `WeeklyPointsChip` importing `TaskType` in `ui/`. Good: the same chip in `domain/shared/`, composing the generic `Pill` from `ui/`.
- **Server shapes inputs.** A page's service returns inputs — rows in their DAL shape (narrowed by `select`), server-only aggregates, lookups — never finished UI models or anything about how the page shows them; the page derives its view on the way down (*Page structure*).
- **Page structure — the Projects page is the pattern.** A route reads its page's data through the read action, shapes it with a pure adapter from `src/utils/` when the page needs one, and renders the page's container (`<Feature>Page`) — no screen layer. The container takes the rows as props and layers its optimistic writes on top (`useOptimisticTasks`), owns the rest of the page's state and every write, and provides them through `<Feature>PageContext`; form modals close once the revalidated props land (`useModalSubmit`). The components below take their rows as props and get writes from the context, never as callback props. Whatever is derived runs where all its inputs are, on every render, and never becomes state. Bad: `ProjectDetail` taking 11 props, 8 of them callbacks it only hands on. Good: `<ProjectStep step={step} />` calling `scheduleStep(id)` from `useProjectsPageContext()`. Details (where a derivation runs, shared and overlay components, frames, the Board's pattern): `design/baseline.md` › Architecture Decision; the Plan page, not on it yet: tracker › Week model Phase 2.

## Coding Conventions

### General

- Domain helpers live in `src/utils/`.
- **DRY — one definition per piece of logic, markup or type.** Markup that repeats with only data or color differences becomes one parameterized sub-component; a semantic color difference comes from a `Record<Key, string>` of literal Tailwind classes (never `` `bg-${accent}` `` — Tailwind can't see it). Identical type shapes collapse to one, and shapes sharing a core extend a base. Bad: five near-identical added / removed / modified sections, each hand-writing the same dot + title + note row; `AddedTemplate` and `RemovedTemplate` declared as identical interfaces. Good: one `ChangeRow` driven by `ACCENT: Record<Accent, {dot: string; border: string}>`; `TemplateChange extends TemplateRef`.
- **Components that belong together share a kebab-case folder** named for the group, each in a file named after it (one component per file is linted; a one-off block that needs the parent's scope is a render function instead). Good: `projects/project-list/` holding `ProjectList.tsx`, `ProjectCard.tsx` and `ArchivedProjectRow.tsx`.
- **Destructure** when two or more properties of the same object are used, instead of repeating `obj.a`, `obj.b`; a single one-off access can stay. Bad: `const feed = useDumpFeed(...); … feed.entries … feed.hasMore`. Good: `const {entries, capture, hasMore} = useDumpFeed(...);` (for a nullish source: `const {entries, nextCursor} = result ?? {entries: [], nextCursor: null};`).
- **Name things plainly — clear and boring beats short or clever.** A function says what it returns or does, including what it looks up by; a variable or parameter — callback parameters included — says what it holds. Full words only: `id`, `tx` (Prisma transaction) and `prev` (setState updater) are fine, single letters are linted (allowed ones in `eslint.config.mjs`), and `t` is next-intl's alone. Bad: `getPlanningPlan(userId, planId)`, `templates.map(t => …)`, `runTool(ctx, body)`. Good: `getPlanContextByPlanId(userId, planId)`, `templates.map(template => …)`, `runTool(context, toolFunction)`.
- **LLM-facing error messages live in `src/utils/errorMessages.ts`**, one UPPER_SNAKE object per surface (`PLANNING_ERROR`, `MCP_ERROR`); a message with dynamic parts is a function of them. Bad: `` throw new PlanningError(`This week already has an active plan (${id})…`) ``. Good: `throw new PlanningError(PLANNING_ERROR.ACTIVE_PLAN_EXISTS(activePlan.id))`.
- **A workaround is fine, but marked.** Code that exists only to get around someone else's bug or quirk — a dependency's, the framework's, a browser's — opens its comment with `Workaround (<whose>):`, says what goes wrong without it, and links the upstream issue when there is one. Upgrading a dependency starts with `grep -rn "Workaround (<name>"`: each one the new version no longer needs goes in the same change. Bad: a re-render on a timer whose comment never says which bug it dodges. Good: `// Workaround (Next.js, vercel/next.js#98303): the first write's page update never commits on its own …`.

### Enums

- Use enum constants (`TaskType.WEEKLY`), never raw strings.
- **Maps are `Record<Enum, T>`; branching is a `switch` whose `default` asserts `never`.** Either way a new enum value fails to compile until it is handled. Bad: `default: return 'neutral';` silently covering a new `TaskType`. Good: `TASK_KIND_STYLE: Record<TaskKind, TaskKindStyle>`; `` default: {const unhandled: never = type; throw new Error(`Unhandled type: ${unhandled}`);} ``.

### Styling

- Heroicons JSX imports for icons, not inline SVG (brand marks and charts may draw their own SVG).
- Tailwind utility classes, no inline styles — `style` only carries dynamic values (a CSS variable, a computed width).
- Semantic daisyUI tokens, never hardcoded colors like `text-yellow-400`; what each channel means is in `design/design-language/README.md`.

### Themes

- **One theme per page.** The theme lives only on `<html data-theme>`: the server renders it from the cookie, the settings sheet and the Design Console re-stamp it. Never nest a `data-theme` scope — theme-gated rules like `[data-theme='p5-dark'] .fx-card` match through any ancestor. Bad: `<div data-theme="mars-light">` around a preview. Good: `document.documentElement.setAttribute('data-theme', next)`.
- **One variable contract.** Every theme declares the same custom properties in `globals.css`, in the same section order; a new variable lands in every theme in the same change, named by role rather than one theme's palette (`npm run check:themes`, CI). Bad: `--fx-blood-red` declared by p5-dark alone. Good: `--fx-depth` in every theme, p5's value being its blood red.

### JSX & components

- **Keep the return statement an outline.** Conditional or complex JSX becomes a named render function (`renderBoardLink()`) with access to the component's scope; reusable pieces become sub-components. Modals split their header, body and footer this way, and a render prop or option label longer than a couple of lines is a named function, not inlined at the call site. Good:

  ```tsx
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

- **No magic literals.** Fixed, non-user-facing literals — routes, numbers, thresholds, durations, style tokens, config values — go into an exported constant in a `constants.ts` next to the component (or a feature `constants/` folder). Bad: `maxLength={280}`, `href="/kanban/plans/new"` inline. Good: `MESSAGE_MAX_LENGTH`, `CREATE_PLAN_HREF` imported from `./constants`.
- **All user-facing copy goes through `next-intl`**: strings live under a namespace in `src/i18n/en.json`, read with `useTranslations` (client) or `getTranslations` (server components, actions, `generateMetadata`). Use ICU for plurals and interpolation, `Enums.*` keys for enum labels, and `t.rich` for inline markup; decorative glyphs and emoji stay in the JSX. Never translated: LLM-facing text (`mcp/prompts/`, `utils/errorMessages.ts`) and internal `throw new Error(...)` messages. Bad: `export const TITLE = 'Create Weekly Plan';`. Good: `{"Plan": {"taskCount": "{count, plural, one {# task} other {# tasks}}"}}` read as `t('taskCount', {count})`.
- **User-facing copy is sentence case**; Title Case is for headers only (page and section titles, nav labels). The same action keeps its casing across states. Bad: "Sign Out" whose confirm reads "Sign out?". Good: "Sign out" / "Sign out?" / "Create task", with headers like "Settings" keeping theirs.

## Code Style

- Props are explicitly typed, preferably with an `interface`.
- Server Components by default; add `'use client'` only when interactivity requires it.

## Tooling

- **Prettier owns formatting** (`.prettierrc.json`; code only — Markdown and `design/` are ignored); don't hand-tune spacing or quotes against it. **ESLint owns correctness** and enforces no `any`, no `console.log` (`console.error` / `warn` allowed) and the server-only import boundary. In production code (`src/` outside the Design Console) it also enforces named exports and `const` arrow components (Next.js convention files excepted), one component per file, and no single-letter names.
- CI runs `format:check`, `lint`, `typecheck`, `knip`, `check:themes`, the Vitest suite with its coverage floors and the Playwright suite — run all but Playwright before pushing (Version Control).

## Data & State

- **Local work never touches production.** `.env.local` points at the local Supabase stack, and `next dev` and the local scripts refuse any other database or Supabase URL. Production credentials live only in `.env.prod`, used by `npm run db:deploy:prod` and only when the owner asks.
- Prefer batch writes (`createMany`, `updateMany`) over per-row loops.
- ACID-critical multi-step writes run in `prisma.$transaction()`; DAL writes take `tx?: Prisma.TransactionClient`.
- Use focused `select` fields unless the full model is needed.
- Extend an existing action or route instead of adding a redundant one.
- One Zustand store per domain at `src/store/<domain>Store.ts` (`settingsStore`, `sidebarStore`), state kept flat; stores never fetch or touch the DB — hooks and actions bridge them.
- One-time scripts (resets, backfills, manual fixes) go in `scripts/one-time/`, outside the build: parameterize identifiers at the top, wrap writes in a transaction, and include a sanity-check `SELECT` and a `ROLLBACK` dry run before `COMMIT`. The first script moves these rules into `scripts/one-time/README.md`.

## Version Control

- **Local sessions** (on the owner's machine): never commit, push or take another outward-facing VCS action without explicit permission — make and stage the changes, summarize them, and wait for approval.
- **Remote sessions** (cloud containers such as Claude Code on the web): commit, push with `git push -u origin <branch>` and open the PR without asking, then subscribe to its activity (`subscribe_pr_activity`) and see it through until it merges or closes: red CI and review comments are the session's to fix.
- Never commit or push to `main`; changes land through pull requests.
- **One task, one branch, one PR.** Everything a session's task produces — its spike, the decision, the implementation, the docs and any follow-ups the owner adds along the way — goes on one branch into one PR. A second branch or PR only when the owner asks for one. Bad: a spike PR plus a stacked implementation PR from the same session. Good: the spike, its Decision and the code it decided, all in one PR.
- **Branch names say what the PR does**: `claude/<feature>-<change>`, kebab-case, a few words, with the step for a multi-PR project. A remote session whose assigned branch is a random name creates a descriptive branch instead. Bad: `claude/quirky-galileo-8ofthc`, `claude/project-data-layer`. Good: `claude/week-model-pr3-project-data-layer`.
- **Before every push**:
  1. `design/tracker.md`: delete finished items and sub-bullets.
  2. README Update Log: today's entry (Documentation Style).
  3. README Current State: rewrite the sections the change touches.
  4. AGENTS.md, or a README it indexes: only when a rule or a directory's responsibility changed.
  5. Run `npm run format`, then `lint`, `typecheck`, `knip` and `npm test` (and `check:themes` when CSS variables changed). CI runs e2e; run `npm run test:e2e` too when a change touches a page's flow.
- **Act on submitted reviews only.** A pending review — comments drafted but not yet submitted — can still change: don't reply to, resolve or push for its comments; at most mention that one is pending.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint (CI)
npm run typecheck    # tsc --noEmit (CI; needs the generated Prisma client)
npm run knip         # Unused files, exports and dependencies (CI; config in knip.jsonc)
npm run format       # Format all code with Prettier
npm run format:check # Verify formatting (CI)
npm run check:themes # Every theme declares the same CSS variables (CI)
npm test             # Unit + integration tests in UTC and Los Angeles time (a local Postgres: test/README.md)
npm run test:unit    # Unit tests only, no database
npm run test:coverage  # Everything, failing below the coverage floors (CI)
npm run test:e2e     # Playwright on the local stack as the e2e user (CI); reuses a running dev server
npm run up           # One-click start: setup, then the dev server (fresh checkout or any day)
npm run setup        # .env.local, npm install, db:setup — no dev server (`-- --no-db` stops after install)
npm run db:setup     # Start the local Supabase stack, migrate, seed (safe to rerun)
npm run db:reset     # Wipe the local stack, migrate, seed
npm run db:stop      # Stop the local stack (data kept)
npm run dev:session  # Sign in as the seeded dev user: Playwright storageState + Cookie header
npm run e2e:session  # Reset the e2e user to the seed's week and sign it in (run by test:e2e)
npm run db:deploy:prod  # Apply migrations to production (.env.prod) — only when the owner asks
npx @modelcontextprotocol/inspector --cli http://localhost:3000/api/mcp --transport http --method tools/list  # MCP smoke test (or drop --cli for the UI)
npx prisma studio
npx prisma migrate dev  # Against the local stack, like every Prisma command but db:deploy:prod
npx prisma generate
```
