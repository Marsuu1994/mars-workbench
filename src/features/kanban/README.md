# Kanban Period Planner

A drag-and-drop kanban board for planning and tracking tasks within weekly periods. See [baseline.md](./design/baseline.md) for full design doc.

## Current State

- **Board**: 3-column kanban (Todo / In Progress / Done) with drag-and-drop, optimistic UI, risk badges, rollover indicators
- **Task sizing**: `TaskSize` enum (XS=1, S=2, M=3, L=5, XL=8) with fibonacci points; `SizeChip` display + pill toggle selector
- **Progress dashboard**: Today ring, stat metrics (points/counts), Week Progress bar using two-query strategy (UI tasks + raw SQL aggregate)
- **Plan management**: Create/edit plans with inline type/frequency config, Plan Mode toggle (NORMAL/EXTREME), `ReviewChangesModal` for diffs
- **Ad-hoc tasks**: One-off tasks with plan linking, column-aware initial status, risk levels based on days since creation
- **Daily sync**: Auto-expire stale tasks, generate today's dailies, 1-day rollover buffer, idempotent via `lastSyncDate`
- **End-of-period sync**: Auto-detect new week, expire undone tasks, transition plan to `PENDING_UPDATE`
- **Workspace sidebar**: Board/Plan nav (Board disabled when no plan, Plan shows "New" badge); Edit Plan button removed from board header
- **PWA**: Manifest, service worker, mobile installability, safe-area insets
- **Architecture**: Server Actions + DAL (3-layer), `prisma.$transaction()` for multi-step mutations, timezone anchored to `America/Los_Angeles`

**AI Assisted Plan Creation** — Fully designed (flows, API, mockups); **backend complete, UI remaining**. The standalone chat demo was removed and the shared `Chat`/`Message` tables now back this flow. All three server actions are done and verified end-to-end: `getTemplateStatsAction` (per-template stats), `createAiChatAction` (static no-LLM welcome + chips, snapshots last-period stats into `Chat.metadata`), `generateDraftPlanAction` (OpenAI `gpt-5-nano` structured draft — reuses templates, calibrates from stats, replays prior drafts as history), and `approveDraftPlanAction` (atomically creates the plan, completes the prior `PENDING_UPDATE` plan, carries over ad-hoc tasks). `Chat.metadata` holds the stats snapshot + a `latestDraft` approval clipboard. Remaining: the chat UI (modal, draft cards, store, action wiring).

**Mobile Mockups** — Board drag-and-drop flow (375x812), settings page, shared `mockup-theme.css` with light/dark toggle.

## Backlog

### High Priority
- [ ] Implement the AI assisted plan creation flow — UI (backend complete: all server actions done & verified)
- [ ] Consolidate task generation logic for update plan
- [ ] Design evidence submit feature when user move task to done

### Medium Priority
- [ ] Setup storybook and optimize workflow for UI mockup
- [ ] Add dashed border to droppable columns
- [ ] Implement mobile view (responsive board)

### Future
- [ ] Research timezone handling for traveling users
- [ ] Support same group ordering for drag and drop within same column
- [ ] Add subtitle field to task template
- [ ] Phone notifications for unfinished tasks
- [ ] Weekly task rollover across periods
- [ ] Biweekly and custom period types
- [ ] Ad-hoc task deletion and auto-clear logic
- [ ] Priority matrix page (Eisenhower matrix)
- [ ] Inline editing of AI draft plan cards before approval (tweak frequency/size/selection without re-prompting)

## Done

- [x] Refactor the codebase, remove chatbot related code

## Update Log

### 2026-06-27
- Removed the unreachable standalone AI chat demo (pages, `/api/chats` + `/api/llm` routes, `features/chat/`, old `chats.ts`/`messages.ts` DAL); kept the shared `Chat`/`Message` tables for reuse
- Completed the **entire backend** for AI Assisted Plan Creation (UI still to come): migration adds a `MessageType` enum + links chats to plans, plus per-template stats aggregation snapshotted into `Chat.metadata`
- `createAiChatAction` — bootstraps the chat with an instant static welcome + suggestion chips (no LLM latency)
- `generateDraftPlanAction` — OpenAI `gpt-5-nano` structured-output draft generator: reuses existing templates, calibrates from last period's per-template stats, replays prior drafts as conversation history, and stores each draft as a `DRAFT_PLAN` message + a single-slot `Chat.metadata.latestDraft` approval clipboard
- `approveDraftPlanAction` — commits the approved draft to a real plan in one atomic transaction: batch-creates the draft's new templates, builds the plan (reusing the create-plan core, extracted as `createPlanInTx`), completes the prior `PENDING_UPDATE` plan, carries over its non-done ad-hoc tasks, and uses the LLM's summary as `Plan.description`
- Each step verified end-to-end against live OpenAI + DB
- Fixed a `set-state-in-effect` lint error in `TaskModal` (form reset → render-phase state adjustment)
- Synced design docs (`api.md`, `baseline.md`, `flows.md`) and `AGENTS.md`

### 2026-06-03
- Redesigned sidebar from feature-level nav (Chat/Kanban) to workspace nav (Board/Plan)
- Board nav disabled with tooltip when no active plan; Plan shows "New" nudge badge
- Removed Edit Plan button from board header (Plan entry now in sidebar)
- Merged `mockup-empty.html` into `mockup-board.html` (3 screens: Board, No Plan, Returning User)
- Updated all mockup sidebars to workspace layout; removed Matrix and Settings nav items
- Added disabled item, tooltip, nudge badge, coming-soon styles to `styles.css`
- Deleted `tmp-topbar-redesign.html` temp file
- Updated `baseline.md`: moved Mobile Kanban + PWA and Workspace Sidebar to Implemented V2

### 2026-03-17
- Implemented `TaskSize` enum migration end-to-end: Prisma schema, hand-crafted SQL migration with backfill (11 templates, 99 tasks), baselined migration history against Supabase
- Updated all server-side code: DAL types/selects, Zod schemas, services, and actions to use `size: TaskSize` with `sizeToPoints()` derivation
- Created `SizeChip` shared component (green chip: `M·3`) — used by TaskCard, TemplateItem, PlanForm, ReviewChangesModal
- TaskModal: pill toggle size selector with effort hint text ("~3 hours of effort") and L/XL warning
- Task card description: added 2-line clamp with `break-all` to prevent long URL overflow
- Added client-safe `TaskSize`, `SIZE_TO_POINTS`, `SIZE_LABELS`, `SIZE_EFFORT` constants to `utils/enums.ts`
- Updated design docs: fixed enum name `TaskSizes` → `TaskSize`, added architecture decisions for size system

### 2026-03-16
- Migrated from free-form `points: Int` to standardized `size: TaskSizes` enum (XS=1, S=2, M=3, L=5, XL=8 fibonacci points) across all design docs (baseline, flows, api)
- Task cards now display a purple size chip (`XL·8`) instead of orange star + raw points — distinct from orange/red risk badges
- Task template and ad-hoc modals: replaced dropdown select with pill toggle buttons (XS|S|M|L|XL) spanning full width, with L/XL warning hint
- Template list items and AI draft cards show inline purple size chips
- Updated all mockups: board, plan form, task modal, AI chat, review changes, mobile board, and all future-work mockups
- Added `--m-purple-bg` theme variable, `.size-chip` and `.size-pill-btn` shared CSS classes
- Design docs: `TaskTemplate.points` replaced with `size: TaskSizes`; `Task` keeps denormalized `points` field derived from size via `SIZE_TO_POINTS` for efficient aggregation
- Progress tracking flow rewritten to reflect actual hybrid architecture (DB aggregate + in-memory projection)
- Create/Update Task Template flows rewritten with clearer modal interaction specs

### 2026-03-10
- Fixed task card risk border: mobile shows top border only (`max-md:`), desktop shows left border only (`md:`) — previously desktop had both
- Preserved risk border color on hover: risk-indicator border (top on mobile, left on desktop) no longer changes to the generic hover border color
- Removed unused `Header.tsx` component and updated project structure in `AGENTS.md`

### 2026-03-09
- Added PWA manifest (`public/manifest.json`) with standalone display, mars-dark theme colors, and 192/512/maskable icons for mobile installability
- Added minimal no-op service worker (`public/sw.js`) to satisfy Chrome's PWA install criteria
- Updated root layout metadata: manifest link, viewport export, apple-touch-icon, appleWebApp config
- Registered service worker from ThemeProvider on mount
- Generated placeholder PWA icons (gradient "M" on dark background) in `public/icons/`
- Fixed dynamic island overlap on iOS PWA: added `env(safe-area-inset-top)` padding to root layout and `env(safe-area-inset-bottom)` to bottom tab bar
- Created shared mockup theme system (`mockup-theme.css`) with light/dark CSS variables, applied to all kanban and auth mockups with interactive toggle button
- Converted all hardcoded colors in kanban mockup `styles.css` and 6 HTML mockup files to theme variables — full dark mode support across board, empty, plan-form, task-modal, ai-chat, and review-changes
- Created mobile kanban mockup (`mockup-mobile/mockup-board.html`): 375×812 phone frames showing drag-and-drop flow (normal state, long press pickup, drag over target), stats dashboard with linear progress bars, compact task cards with risk top strips
- Created mobile settings mockup (`mockup-mobile/mockup-settings.html`): profile card with sign-out button, 3-tab dock (Board, Plan, Settings)
- Task card widget showcase: all card states (normal, rollover, warning, danger, done, lifted) at mobile size
- Removed `mockup-v2/` directory — redundant with `future-work/` subfolder
- Removed danger border from Plan Mode section in edit mode mockup

### 2026-03-08
- Fixed timezone bug causing false end-of-period sync: `getISOWeekKey()` used UTC methods while `getTodayDate()` used local time, producing mismatched week keys near week boundaries
- Anchored all date calculations to `America/Los_Angeles` timezone via `KANBAN_TZ` constant and `Intl.DateTimeFormat`, ensuring consistent "today" on both local dev and Vercel (UTC) deployments

### 2026-03-03
- Designed AI assisted plan creation flow end-to-end: updated `baseline.md`, `flows.md`, `api.md`
- Created mockups: `mockup-empty.html`, `mockup-plan-form.html`, `mockup-ai-chat.html`
- Reorganized `api.md` by logical domain; updated DAL function signatures and `fetchBoard` pseudocode

### 2026-02-28
- Plan Mode (NORMAL/EXTREME): schema, services, board sync, plan form UI, review modal, mockups

### 2026-02-26
- Complete v2 UI redesign: `mockup-v2/` with 11 flows and shared design system CSS
- Custom daisyUI themes (`mars-dark`, `mars-light`) applied to app

### 2026-02-25
- Designed Eisenhower priority matrix; archived to `future-work/mockup-priorities-v2.html`

### 2026-02-24
- Ad-hoc task flow end-to-end: design docs, schema migration, DAL, services, actions, board UI, plan form integration
- Unified `mockup-task-modal.html` (3 tabs: New Template, Edit Template, Add Ad-hoc)
- ReviewChangesModal rebuilt with icons, badges, per-template impact text, ad-hoc sections

### 2026-02-23
- Moved type/frequency from TaskTemplate to PlanTemplate; added Task.type column
- Plan form: inline type pills + frequency per template; "Review Plan Changes" modal

### 2026-02-20
- Introduced `services/` layer; thinned actions to validate → service → revalidate
- Wrapped all multi-step mutations in `prisma.$transaction()`
- Split monolithic mockup into per-flow files under `design/mockup/`

### 2026-02-19
- Skeleton loading states, projected week points (Option C), remove confirmation modal

### 2026-02-15
- Progress dashboard, end-of-period sync, template preselection from previous plan

### 2026-02-14
- Create/edit template modal, edit plan flow, board header, shared PlanForm component

### 2026-02-13
- Drag-and-drop with optimistic UI, board columns, empty state, create plan flow

### 2026-02-12
- Initial implementation: Prisma schema, DAL, Zod schemas, server actions, board sync, daily sync