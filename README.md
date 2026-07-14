# Mars Workbench

A kanban-first personal productivity app: a weekly period planner built around a drag-and-drop kanban board, an Eisenhower priority matrix, and AI-assisted plan creation. Next.js + Supabase (Google OAuth) + Prisma, deployed on Vercel.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Docs

- [design/](./design/README.md) — centralized design docs: [baseline](./design/baseline.md) (goal, entities, schema, decisions), [tracker](./design/tracker.md) (open ideas/todos), [reference](./design/reference.md) (actions/services/DAL inventory), [flows/](./design/flows) (per-page flow docs), [mockup/](./design/mockup) (HTML mockups)
- This README holds the app-wide **Current State** and the append-only **Update Log**

## Current State

### Design System

- **"Mission Control HUD"** (`design/design-system.md`): app-wide visual language on two custom daisyUI themes — `mars-dark` (default, night ops deck) / `mars-light` ("dawn on Mars" — warm sand, not white) — built on seven OKLCH hue-wheel stops with numerically verified contrast (dark AAA, light ≥ 4.9:1), plus a token-derived `fx-*` utility layer in `globals.css` (cosmic-sky shell (blooms + SVG nebula art + star chart), console chips, status LEDs, mono telemetry type, glow CTAs, AI holo border, quadrant blooms). Color channels: cyan = action/telemetry, violet = AI, orange = drop-targets/signature, blue = datalink stats, green = go, amber/bronze = caution, red = abort. Palette changes must follow the sync points listed in the design doc (globals ↔ manifest ↔ viewport ↔ mockup-theme ↔ login mockup)

### Board

- **Board**: 3-column kanban (Todo / In Progress / Done) with drag-and-drop, optimistic UI, risk badges, rollover indicators. Done cards are drop targets but cannot be dragged out; during a drag all droppable columns get a faint dashed outline and the hovered one a solid dashed highlight (on mobile the hovered row's card strip gets a dashed border + tint and its row title highlights). Per-column accent colors (Todo=info, In Progress=warning, Done=success) and per-card left borders render correctly (risk cards override the left edge with their color).
- **Backlog drawer ("Queued")**: stages template-generated instances (`status = BACKLOG`) and pulls them onto the board (`BACKLOG → TODO`). Desktop is a right-edge panel (drag to pull); mobile is a bottom sheet (`modal-bottom`) opened from a peeking "Queued" pill above the tab bar (tap `↑ Todo` to pull). Reuses the board's badge/instance/rollover/risk language with a `#n` instance badge (when template `frequency > 1`); cards group by template and order by instance index (e.g. leetcode #1, #2, workout #1, #2). Desktop open/collapse cross-fades smoothly while the width animates. Excluded from Today totals, included in Week projection.
- **Task sizing**: `TaskSize` enum (XS=1, S=2, M=3, L=5, XL=8) with fibonacci points; shared `SizeChip` display + pill toggle selector (`src/components/shared/`)
- **Progress dashboard**: Today ring, stat metrics (points/counts), Week Progress bar using two-query strategy (UI tasks + raw SQL aggregate)
- **One-off tasks on the board**: board cards show one-off (`AD_HOC`) tasks with an amber "ONCE" type badge (the internal type stays `AD_HOC`; all user-facing "ad-hoc" copy reads "one-off"). Created from the priority matrix only (board-side creation removed) and reach the board via Track This Week; risk levels based on days since creation apply to board cards only (see Priorities below)
- **Sync lifecycle (`syncService.ensureSynced`)**: single entry point (`src/services/syncService.ts`) awaited by every kanban page (board / priorities / plan create / plan edit) before reading plan state — daily sync (auto-expire stale tasks, generate today's dailies, 1-day rollover buffer, idempotent via `lastSyncDate`) plus end-of-period sync (auto-detect new week, expire undone tasks, transition plan to `PENDING_UPDATE`). React `cache()`-deduped per request; page-visit order never matters
- **Empty board states**: new-user ("No active plan") vs returning-user ("Plan period ended") recap showing last period's completion %, tasks done, and points earned; both link to plan creation
- **PWA**: Manifest, service worker, mobile installability, safe-area insets
- **Mobile mockups**: board drag-and-drop flow (375x812) and backlog bottom-sheet drawer + placement-options comparison in [design/mockup/board/](./design/mockup/board/), shared `mockup-theme.css` with light/dark toggle

### Plan

- **Plan management**: create/edit plans (`/kanban/plans/new`, `/kanban/plans/[id]`) with inline type/frequency config per template (frequency via a −/+ stepper bounded 1–10), Plan Mode toggle (NORMAL/EXTREME), and a `ReviewChangesModal` diff before committing edits
- **Mobile plan form**: single-column layout under the Plan dock tab — the desktop app header (Kanban Planner + Planning Mode badge) is reused as-is and the page heading (with the edit plan's week range on mobile) scrolls away with the form; the AI banner compacts to a tappable row, and the summary + submit footer docks as a fixed bar above the tab bar (Cancel is desktop-only). The template modal and `ReviewChangesModal` render as bottom sheets (`modal-bottom md:modal-middle`); the review sheet scrolls its change summary between a pinned header and footer. Mockups in [design/mockup/plan/](./design/mockup/plan/) (`mockup-plan-form-mobile.html`)
- **Templates**: reusable task templates managed inline from the plan form (`templateActions`), preselected from the previous plan; template instances generate as `BACKLOG` for the board's "Queued" drawer
- **AI-assisted plan creation**: complete (backend + UI), backed by the shared `Chat`/`Message` tables. Server actions verified end-to-end: `getTemplateStatsAction` (per-template stats), `createAiChatAction` (static no-LLM welcome + suggestion chips, snapshots last-period stats into `Chat.metadata`), `generateDraftPlanAction` (OpenAI `gpt-5-nano` structured draft — reuses templates, calibrates from stats, replays prior drafts as history), and `approveDraftPlanAction` (atomically creates the plan, completes the prior `PENDING_UPDATE` plan, carries over ad-hoc tasks). `Chat.metadata` holds the stats snapshot + a `latestDraft` approval clipboard
- **AI chat UI**: Zustand-backed modal (`store/aiPlanChatStore` state + `hooks/useAiPlanChat` action bridge) opened from the plan form's AI assistant banner (create mode only), with suggestion chips, draft-plan cards, a refine→approve flow, and a success banner (`components/ai-chat/`). The composer sends on Enter (Shift+Enter for newline) and is IME-safe — an Enter that commits an input-method composition does not send
- **Durable chat**: the DB chat row is the source of truth — on open it resumes the user's most recent unapproved chat (`getActiveAiChatAction` → rehydrate) across modal close, reload, and restart, and auto-resumes a generation interrupted mid-run (`resumeDraftPlanAction`); approval sets `Chat.planId`, so the next open starts fresh. Resume is scoped to the current period, so a chat left unapproved in a prior period (which predates the current pending plan and has no stats snapshot) can't shadow the returning-user welcome — a fresh, stats-bearing chat is created instead

### Priorities

- **Matrix page**: full-page 2×2 Eisenhower matrix at `/kanban/priorities` (sidebar item + mobile dock tab) organizing all non-DONE AD_HOC tasks by `quadrant` (`PriorityQuadrant` enum: `DO_FIRST / SCHEDULE / SQUEEZE_IN / MAYBE_LATER`, backfilled to `SCHEDULE`); null-quadrant cards defensively group into `SCHEDULE`
- **Reprioritize**: drag between quadrants (tracked cards too — only `quadrant` changes) with optimistic update + rollback and full drag visuals (dimmed quadrants, drop-target outline, per-quadrant drop-hint banner)
- **Track This Week**: hover send `→` → popover (desktop) or tap card → bottom sheet (mobile) pulls a matrix task onto the board into Todo/In Progress (`BACKLOG → TODO/DOING` + plan link, one write); tracked cards render dimmed with a "This Week" tag (★ on mobile)
- **Add Priority Task**: quadrant "Add" buttons (desktop) open the shared task modal with the quadrant preset; on mobile a round "+" appended to the My Priorities title bar opens it as a bottom sheet with a 2×2 quadrant picker (defaults to Schedule) and confirms with an "Added to {quadrant}" toast. Both create unassigned matrix tasks (`planId = null`, `BACKLOG`); the matrix is the only one-off entry point (board-side creation removed). Deselecting a one-off task from a plan returns it to the matrix pool, while DONE tasks stay on their plan to preserve point history. Mobile mockup: [design/mockup/priorities/](./design/mockup/priorities/) (`mockup-priorities-new-task-mobile.html`)
- **"ONCE" badge / one-off copy**: AD_HOC tasks display an amber "ONCE" type badge (board cards included; all-caps to match `DAILY`/`WEEKLY`), and all user-facing "ad-hoc" copy reads "one-off" — the internal `AD_HOC` enum and `adhoc*` i18n keys are unchanged. Matrix risk treatment is an open design item
- **No-plan guard**: no active plan (incl. the stale-ACTIVE-plan window after ISO week rollover, guarded server-side in `matrixService`) → warn hint bar with a Create Plan link (rendered on both breakpoints — the only case where mobile shows the hint bar) + disabled send/sheet buttons

### Auth

Supabase Auth with Google OAuth, route protection, themed login page, and collapsible app sidebar with workspace navigation (Board/Priorities/Plan) and sign-out. Nav links are always enabled — no pre-plan disabled state (the board shows its empty state instead); the Plan link keeps its "New" nudge badge when no plan exists. Settings is reachable from the mobile dock only (see `design/flows/auth.md`). All mockups support light/dark theme toggle via shared `mockup-theme.css`. Deployed on Vercel.

Open items: see [design/tracker.md](./design/tracker.md).

## Done

- [x] Priority matrix follow-ups: "Todo"/"Queued" renames, `ensureSynced` sync consolidation, mockup back-ports, gallery entries
- [x] Implement priority matrix page
- [x] Add dashed border to droppable columns (drag-target highlight)
- [x] Returning-user empty board ("Plan period ended" recap with last-period stats)
- [x] Implement the AI assisted plan creation flow — UI (Zustand store + bridge hook + chat modal, wired to the plan form)
- [x] Refactor the codebase, remove chatbot related code
- [x] Add userId to existing features (kanban) — per-user scoping + `user_id NOT NULL` enforcement
- [x] Workspace sidebar redesign (Board/Plan nav with disabled state and nudge badge)
- [x] Light/dark theme toggle on login and sidebar mockups
- [x] Create feature scaffold and design doc templates
- [x] Design auth approach (provider selection, session strategy, schema)
- [x] Design login/signup UI flows and mockups
- [x] Connect to Supabase database and migrate data
- [x] Add auth infrastructure (Supabase clients, callback route, route protection proxy)
- [x] Implement login/signup pages
- [x] Redirect authenticated users away from `/auth/login` to homepage
- [x] Collapsible app sidebar with sign-out flow
- [x] Deploy app on Vercel

## Update Log

### 2026-07-09
- **Board scenarios are now tab-switched**: `/design/scenarios/board` no longer stacks its states down one long scroll — a tab bar (`ScenarioTabs`) switches between them one frame at a time, mirroring the screen navigator of the HTML mockups these scenarios replace. Only the active scenario is mounted, so inactive boards never render. The four tabs now match the board mockup's screens: **New user** (no active plan) · **Returning** (last-period recap) · **Board** (active plan, backlog collapsed) · **Board — drawer open** (backlog "Queued" drawer expanded). Reaching the drawer-open state adds an optional `defaultOpen` on `BacklogDrawer` (threaded through `KanbanBoard` as `defaultBacklogOpen`), so a scenario can render the board with the drawer pre-expanded
- **Scenario frames are non-interactive**: previews compose the real page components (`KanbanBoard`, `EmptyBoard`) whose handlers are wired to live server actions and navigation, so a drag or a CTA click was firing a real `updateTaskStatusAction` against fixture IDs / navigating to `/kanban/plans/new`. `ScenarioFrame` is now `inert` by default (opt back in via `interactive`), disabling interactions so a scenario stays a pure visual reference
- **Scenario frames sandbox `position: fixed`**: the mobile backlog "Queued" pill (and any other viewport-anchored bit of the real components) was floating over the whole page instead of sitting inside the preview frame. `ScenarioFrame` now sets `contain: layout`, making it the containing block for fixed descendants + clipping them with `overflow-hidden` — a self-contained device-viewport sandbox, with no change to the production components

### 2026-07-06
- **Mobile/desktop drift spike**: audited every feature (board, priorities, plan/AI chat, app shell) for capability drift between breakpoints. Most divergences are intentional and mockup-documented; three undocumented drifts were fixed, the rest recorded
- Priorities: the no-plan warning bar ("No active plan — Create Plan to track tasks this week") now renders on **both** breakpoints — previously it was desktop-only, leaving mobile users with no in-page path to plan creation; the instruction variant of the hint bar stays desktop-only. Mockup back-port: new no-plan phone frame in `mockup-priorities.html`
- Sidebar: removed the pre-plan Board guard (disabled link + "Create a plan first" tooltip) — the Board link is now always live, matching the mobile dock; without a plan the board shows its empty state. Mockup back-port: `mockup-board.html` no-plan/returning screens + removed the disabled-item styles from `styles.css`
- Board (mobile): the drop-target row now matches the mockup during a drag — dashed border + tint on the hovered row's card strip and a highlighted row title (previously only a faint background tint)
- Recorded the remaining drifts: tracker items for the AI plan chat modal's missing mobile adaptation, the hover-only template edit (pencil) affordance redesign, and a uniform cross-page header (resolving the BoardHeader green-vs-primary accent drift); the settings-entry asymmetry (mobile dock tab only, no desktop sidebar link) is documented as accepted in `design/flows/auth.md`
- Fixed the AI plan assistant showing the generic new-user welcome instead of the returning-user recap (last period's completion %, tasks, points) when a pending plan exists: the durable-resume path (`getActiveAiChat`) was unbounded in time, so an unapproved chat left over from a prior period — created when no pending plan was in context, so it carries no stats snapshot — was resumed forever and shadowed a fresh, stats-bearing chat. Resume is now scoped to the current period (`getLatestInProgressChat` takes a `since` = start of the current ISO week); stale prior-period chats are ignored so a returning user always gets the stats welcome
- Fixed the AI chat composer sending a message on the Enter that commits an input-method (IME) composition — e.g. pressing Enter to confirm English typed under a Chinese IME. `ChatInputBar` now ignores Enter while `isComposing`, so composition commits normally and only a real Enter sends
- Cleaned up two abandoned `planId = null` AI chats left over from earlier testing (one-time script `scripts/one-time/cleanup-stale-ai-chats.ts`, run once; targets unapproved chats created before the current period)

- **App-wide design-system redesign ("Mission Control HUD")** — the whole UI moved to a new visual language: your week as a flight plan flown from a console. Chosen by a 3-judge panel from four competing directions (Mission Control HUD, Aurora Holo-Glass, Synthwave Terraform, Bioluminal Deep Space), then hardened with the best elements of the losers. Spec + rationale in `design/design-system.md`
- **New themes**: `mars-dark` (night ops deck — near-black blue consoles, phosphor-cyan primary, violet AI channel, mars-signal-orange accents) and `mars-light` (**"dawn on Mars"** — deliberately not white: warm sunlit-sand bases, cool space-ink text, mars-rock neutral, the same seven hues driven deep) rebuilt on seven OKLCH hue-wheel stops with numerically verified WCAG contrast: dark all AAA (≥ 7:1), light all pairs ≥ 4.9:1 and all signal colors body-text grade on the sand base. Light `warning` re-seated to bronze, fixing three pre-existing AA failures where body-size `text-warning` sat on the page background (ReviewChangesModal, MobileTrackSheet, PriorityMatrixPage)
- **`fx-*` utility layer** in `globals.css` (token-derived via `color-mix`, so both themes restyle automatically): four-corner cosmic-sky shell (blooms + SVG nebula art + star chart) (a fine 24px dot field plus sparse 96px "stars" — replaced the earlier line grid, which read as clutter; mobile keeps only the sparse layer), glass chrome (sidebar; the mobile dock stays solid for scroll perf), reticle corner brackets, `currentColor` console chips, glowing status LEDs, mono telemetry type (`fx-label`/`fx-num` — sans for humans, mono for the machine), glow CTAs, AI holo border, per-quadrant corner blooms, orange drop-target channel. All loops animate opacity/transform only and respect `prefers-reduced-motion`
- **Components rewired**: board columns (LED status headers, mono telemetry labels, orange `fx-target` drop zones), TaskCard (edge-light + drag glow lift), TaskTypeBadge/SizeChip (console chips), ProgressDashboard (static halo ring + continuously rotating orbit tail — a deliberate product choice, transform-only and reduced-motion-aware — plus telemetry numerals), priority quadrants (semantic corner blooms + LED headers), AI chat (violet channel identity, holo loading bubble, gradient hairline header), sidebar/dock (glass/solid chrome, luminous active-nav rail, multi-hue dock hairline), login (token-derived glows, seamless grid-crawl animation, breathing brand halo), modals (console panel + boot-in; reticle corners on desktop, bottom-sheet grip on mobile)
- **Mockups re-themed**: `mockup-theme.css` fully re-seated to the new palette (per-theme brand hexes + all ~40 rgba alpha-ladder values regenerated), login mockup's private token block synced, hardcoded palette bypasses fixed across ai-chat/task-modal/sidebar mockups and `styles.css`; mockup badges/chips adopt the mono console voice
- PWA `manifest.json` + viewport `themeColor` synced to the new dark bases; `/design` gallery extended into a Design Console (palette swatches with roles, HUD-primitive specimens)

### 2026-07-04
- Mobile plan form + task modals (the last mobile piece): the shared `TaskModal` and `ReviewChangesModal` now render as bottom sheets on mobile (`modal-bottom md:modal-middle`, grip, full-width Cancel/primary footer split); the review sheet scrolls its change summary between a pinned header and footer
- Plan pages on mobile: the desktop app header (Kanban Planner + Planning Mode badge) shows on both breakpoints and the page heading scrolls with the form (edit mode adds the plan's week range on mobile via a new `periodKey` prop); the AI assistant banner compacts to a single tappable row, and the summary + submit footer docks as a fixed bar above the tab bar. The priorities page likewise un-hides its `BoardHeader` + My Priorities title bar on mobile (the "+" add button lives in the title bar) — all pages now reuse the desktop header on mobile
- Template frequency is now a −/+ stepper (bounds in `components/plan/constants.ts`: 1–10, minus disabled at 1) on both breakpoints, replacing the bare number input; desktop mockup back-ported to match
- Priority matrix mobile add: round "+" button in the title bar opens the adhoc task modal without a preset quadrant, which shows a new 2×2 `QuadrantPicker` (defaults to `FALLBACK_QUADRANT` = Schedule); `TaskModal.onSaved` now reports the landed quadrant and the matrix page confirms with a 2.5s "Added to {quadrant}" toast (mobile picker flow only)
- New source-of-truth mobile mockups: `design/mockup/plan/mockup-plan-form-mobile.html` (create/edit + template sheet + review sheet + freq stepper) and `design/mockup/priorities/mockup-priorities-new-task-mobile.html` (entry + sheet + toast)
- Plans scroll fix (on-device): `/kanban/plans/*` joined the self-scrolling routes in `AppShell` (main `overflow-hidden`) and the plans layout sizes with `h-full` instead of `h-screen` — previously the layout overflowed main's dock-padded box, producing double scrollbars and letting the Kanban Planner header scroll away; now the header stays put and only the form body between it and the fixed footer scrolls

### 2026-07-03
- Mobile viewport fixes from on-device testing of the Priorities page: the app shell (`AppShell` `h-screen`, root `body` `min-h-screen`) now sizes with dynamic viewport units (`h-dvh`/`min-h-dvh`), so the layout matches the real visible viewport on mobile Safari instead of overflowing behind the browser chrome (the page no longer hides the matrix x-axis behind a phantom scroll)
- `<main>`'s mobile bottom padding now clears the fixed daisyUI dock exactly (`calc(4rem + env(safe-area-inset-bottom))` instead of `pb-20`), so content — including the matrix x-axis — is never covered by the tab bar on devices with a home indicator; dropped `BottomTabBar`'s manual safe-area padding (daisyUI's `.dock` already applies it)
- The matrix y-axis now shows the full "Not Important" label on mobile (the "Not Imp." abbreviation and its `axisNotImportantShort` key are removed); mockup back-port: `mockup-priorities.html` mobile frames updated to match
- PWA launch fix: the installed app no longer shows a gap between the bottom dock and the screen bottom on launch (it used to snap into place only after the first scroll). Root cause: with the `black-translucent` status bar, iOS lays out the standalone viewport short by the status-bar height until the first scroll gesture, so the fixed dock (and the Queued bar) floated above the real screen bottom. The status bar is now opaque (`statusBarStyle: "black"`), making the launch layout identical to the steady-state one; safe-area paddings adapt automatically via `env()`
- **Repo restructure (layer-first)**: dissolved the `features/` layer — `actions/`, `services/`, `store/`, `hooks/`, `prompt/`, `types/`, `utils/`, `schemas.ts` now live at `src/` top level (one folder per layer, matching the pre-split kanban layout); components regrouped by page under `src/components/{board,plan,priorities,auth}` with cross-page UI in `components/shared`; `lib/kanban` dissolved (`utils` → `src/utils`, `schemas` → `src/schemas.ts`, `syncService` → `src/services/`, shared types merged back into `src/types/aiChat.ts`); reverted the interim taskActions / types file splits; merged the four feature READMEs into this root README (both Update Logs interleaved by date, entries verbatim). Centralized `design/` docs unchanged.

### 2026-07-02
- Started the **Priority Matrix implementation** (backend groundwork, PR 1 of 3 per the reviewed plan): migration `20260702000000_add_priority_quadrant` adds the `PriorityQuadrant` enum (`DO_FIRST / SCHEDULE / SQUEEZE_IN / MAYBE_LATER`) and a nullable `Task.quadrant` column (AD_HOC only), backfills all existing AD_HOC tasks to `SCHEDULE`, and normalizes unassigned ad-hoc tasks (plus any non-DONE strays on COMPLETED plans) to the uniform `BACKLOG` semantics; read-only pre-migration sanity queries in `scripts/one-time/check-adhoc-states.sql`
- Behavior change/fix: `unlinkAdhocTasksFromPlan` now sends deselected ad-hoc tasks back to the priority matrix (`planId = null` + `status = BACKLOG`) and **excludes DONE tasks** — completed ad-hoc points keep their historical plan attribution (previously every plan turnover silently unlinked DONE ad-hoc tasks too)
- Plumbing: `TaskItem` + `taskSelect` expose `quadrant`; client-safe `PriorityQuadrant` mirror in `utils/enums.ts`; `/design` gallery `baseTask` fixture extended; `api.md` synced with the new unlink semantics
- Shipped the **Priorities page** (PR 2 of 3): new `/kanban/priorities` route (desktop 2×2 matrix + mobile compact grid, own `loading.tsx` skeleton, shared `BoardHeader` week badge with current-ISO-week fallback) with all four flows — landing (`fetchPriorityMatrixAction` → `matrixService.fetchPriorityMatrix`, counts derived client-side), reprioritize drag-and-drop (`updateTaskQuadrantAction`, optimistic + rollback, full drag visuals: dimmed quadrants, drop-target outline/label highlight, per-quadrant drop-hint banner), Track This Week (`trackTaskAction` → `trackAdhocTask` single-write `planId`+`status`; desktop hover-send popover, mobile tap → `modal-bottom` sheet; optimistic dim + "This Week"/★ tag + count bump), and Add Priority Task (quadrant `Add` buttons reuse `TaskModal` adhoc mode with a `quadrant` prop; `createAdhocTaskAction` rewritten to create `planId = null` + `BACKLOG`)
- **Stale-plan guard** in `matrixService`: an ACTIVE plan whose `periodKey` ≠ current ISO week counts as no plan and triggers the same End of Period Sync as the board (shared `isPeriodCurrent` in `dateUtils`), so landing on Priorities first after week rollover can't display or track into an ended plan — and the no-plan "Create Plan" CTA actually works (a read-only guard would dead-end at plan creation's active-plan check); enforced in both fetch and track
- New components `components/priorities/` (`PriorityMatrixPage`, `QuadrantCell`, `MatrixTaskCard`, `TrackPopover`, `MobileTrackSheet`, `constants.ts`), `SizeChip` gains a `labelOnly` variant (mobile matrix chips); null-quadrant cards defensively group into `SCHEDULE`
- Navigation: "Priorities" added to `AppSidebar` (Board → Priorities → Plan, `TableCellsIcon` as the closest Heroicon to the mockup glyph) and `BottomTabBar` (4 tabs, Settings kept); `/kanban/priorities` added to `AppShell.SELF_SCROLLING_ROUTES` (dnd single-scroll-parent)
- **Deprecated board-side ad-hoc creation**: removed the column "Add ad-hoc task" button (`BoardColumn`), the board's `TaskModal` wiring (`KanbanBoard`), and the `Board.Column.addAdhocTask` key; plan create/edit pages now preload only the relevant plan's ad-hoc tasks (unassigned ones are tracked from the matrix instead)
- i18n: new `Priorities` namespace + `Enums.PriorityQuadrant`; `TaskModal` adhoc copy → "Add Priority Task" / "Add to matrix"; board/plan/AI-approve mutations now also revalidate `/kanban/priorities`
- Docs synced: `api.md` (Priority Matrix section, createAdhocTaskAction rewrite, new DAL entries), `flows.md` (removed the deprecated Ad-hoc Task Creation Flow, renumbered Create Plan steps, stale-plan-guard + mobile no-plan rules), `baseline.md` (Priorities → Implemented V2)
- Wrapped up the feature (PR 3 of 3):
  - **Sync consolidation**: new `syncService.ensureSynced(userId)` — the single sync entry point (end-of-period + daily, React `cache()`-deduped, idempotent) awaited by board, matrix, and both plan pages before reading plan state; `runDailySync`/`runEndOfPeriodSync` moved from `boardService` to `syncService` (still standalone for a future cron — added to Backlog). Plan pages landing right after week rollover now see the pending plan correctly without visiting the board first
  - **Renames**: AD_HOC type badge displays as **"Todo"** in blue (`Enums.TaskType.AD_HOC` + `TaskTypeBadge` primary tokens); backlog drawer → **"Queued"** (`Board.Backlog.title/openLabel/closeLabel`); `Review.adhocRemovedNote` → "Will return to the Priorities matrix"
  - **Bug fix**: mobile matrix cards rendered two size chips — `SizeChip` hardcodes its own `display` class, so passing `hidden`/`md:*` via className was a stylesheet-order coin flip; visibility now lives on wrapper spans
  - **Mockup back-ports** (source-of-truth sync): `mockup-priorities.html` (no drag rotate, no quadrant dim — dnd stacking-context conflict, drop-hint as non-layout overlay, blank ghost placeholder, TableCells-style nav icon, 4-tab dock with Settings, mobile no-plan sheet note); `mockup-board.html` + `mockup-board-backlog-drawer.html` (add-ad-hoc buttons removed, "Todo" badges, "Queued" labels); `mockup-task-modal.html` ("Add Priority Task" / "Add to matrix" / banner copy); `mockup-review-changes.html` (removed-note copy); `mockup-plan-form.html` (unassigned-pool cards removed); `mockup-mobile/mockup-board.html` ("Todo" badges); shared `styles.css` (`.badge-adhoc` → `.badge-todo`, blue)
  - **/design gallery**: `MatrixTaskCard` section (default + tracked states)
- Design-doc restructure: `flows.md` gains a **Shared** domain section — a new "Ensure Synced Flow" (the `syncService.ensureSynced` entry point every kanban page awaits) plus the Daily Sync and End of Period Sync flows moved out of the Kanban section (their triggers now note they're checked by Ensure Synced); board Landing / Priorities Landing / Track rules reference the shared flow instead of restating guards. `api.md` mirrors it with a "Shared (syncService)" section; `baseline.md`'s daily-recompute bullet points at the shared entry
- Naming pass (follow-up to the priority-matrix wrap-up): reverted the AD_HOC type badge from the blue **"Todo"** back to the previous amber/olive look, relabeled as **"ONCE"** (all-caps to match the `DAILY` / `WEEKLY` badges) — `Enums.TaskType.AD_HOC` value + `TaskTypeBadge` tokens (`text-warning`); the `/design` gallery and task modal pick this up automatically via the shared badge. Also swapped all remaining user-facing "ad-hoc" prose to **"one-off"** (plan-form section labels + footer summaries, review-changes heading, task-modal title); internal `AD_HOC` enum / `adhoc*` i18n keys / code comments unchanged
- Removed the back-chevron (`ChevronLeft` return link) from the plan create/edit header (`plans/layout.tsx`) — it was out of pattern with the rest of the app chrome; dropped the now-unused `Link` / `ChevronLeftIcon` imports
- Mockup back-ports (source-of-truth sync): `styles.css` / `mockup-board.html` / `mockup-board-backlog-drawer.html` / `mockup-priorities.html` / `mockup-mobile/*` (`.badge-todo` → `.badge-adhoc` olive, "ONCE" labels), `mockup-plan-form.html` / `mockup-review-changes.html` / `mockup-task-modal.html` ("one-off" copy), and removed the header `back-btn` from `mockup-plan-form.html`

### 2026-06-30
- Started **i18n standardization** for the kanban feature with `next-intl` in single-locale "App Router without i18n routing" mode — no `[locale]` URL segment and no middleware, so the Supabase auth `src/proxy.ts` is untouched. Wired the `createNextIntlPlugin()` wrapper (`next.config.ts`), per-request config (`src/i18n/request.ts`, locale fixed to `en`), `<NextIntlClientProvider>` in the root layout, and compile-time type-safe keys via `src/global.d.ts` augmenting `messages/en.json`
- Migrated the already-centralized copy into `messages/en.json` namespaces (`Board.Backlog`, `AiChat`): `BacklogDrawer` and the ai-chat consumers (`AiAssistantBanner`, `ChatInputBar`, `CreateActionBar`, `CreatedBanner`, `AiPlanChatModal`) now read copy via `useTranslations`; deleted both `constants.ts` copy files
- Scope is P0+P1 of a phased migration; still inline (later phases): remaining JSX literals, enum→label maps (`SIZE_LABELS`/`SIZE_EFFORT`/`TaskTypeBadge`/`COLUMN_CONFIG`/status·mode labels), server-side strings (action/service errors, zod messages, AI welcome/chips), and route metadata. LLM prompt files (`prompt/*.ts`) are intentionally never translated
- Merged the latest `main` (board-UI polish + returning-user empty board) into the branch and resolved a `BacklogDrawer` conflict — kept main's cross-fade collapsed-drawer UI together with the i18n `useTranslations` migration
- Fixed a Vercel build failure caused by a `package-lock.json` drift: `prisma` (CLI) had floated to 7.8.0 while `@prisma/client` stayed 7.1.0, so the 7.8.0-generated client imported a `query_compiler_fast_bg.*.wasm` runtime module the 7.1.0 runtime doesn't ship (`module not found` via `layout.tsx → lib/prisma.ts`). Re-pinned the whole prisma family back to 7.1.0 to match `main`'s baseline
- Implemented the **mobile Backlog drawer** as a bottom sheet (closing the "mobile drawer deferred" gap): a peeking "Backlog" pill (`fixed` above the tab bar, hidden when the backlog is empty) opens a daisyUI `modal-bottom` sheet listing staged tasks; tapping a card's `↑ Todo` button pulls it (`BACKLOG → TODO`) via the existing `updateTaskStatusAction` with an optimistic update (`KanbanBoard.handlePullToTodo`). Tap-to-pull is a deliberate per-platform difference from desktop's drag (a sheet covering the board makes drag-out fiddly; backlog is a one-way source anyway)
- New components `MobileBacklogSheet` (pill + modal, header/hint/body render-function split) and `BacklogSheetCard` (full-width presentational row, non-draggable); desktop `BacklogDrawer` unchanged. Both entries stay mutually exclusive via `md:` visibility
- Extracted `isRolloverTask(task, today)` into `utils/taskUtils.ts`, shared by `TaskCard` and `BacklogSheetCard`; added mobile copy to `kanban/constants.ts`; board scroll area gets `max-md:pb-32` so content clears the fixed pill
- Design: explored three placements (bottom sheet / 4th board row / FAB + full-screen) in `mockup-board-backlog-drawer-options.html`; chose the bottom sheet (covers the dock as a standard modal) and finalized `mockup-board-backlog-drawer.html`
- Folded the mobile backlog copy from PR #5 into the i18n migration: `HINT_TAP_TO_TODO` / `PULL_TO_TODO_LABEL` moved to `messages/en.json` (`Board.Backlog`) and `MobileBacklogSheet` / `BacklogSheetCard` now read via `useTranslations`, keeping `kanban/constants.ts` deleted
- Relocated the message catalog from `messages/en.json` to `src/i18n/en.json` (per PR review) so all i18n lives under `src/i18n/`; updated the imports in `src/i18n/request.ts` (`./en.json`) and `src/global.d.ts` (`./i18n/en.json`)
- Completed the i18n migration (**P2–P5**) — the kanban feature is now fully internationalized. `src/i18n/en.json` grew to namespaces `Enums` / `Board` / `TaskModal` / `Settings` / `AiChat` / `Errors` / `Validation` / `Metadata` / `Plan` / `Review`:
  - **Enum→label maps** (`Enums.*`): removed `SIZE_LABELS` / `SIZE_EFFORT` / `sizeToLabel` from `utils/enums.ts` and split `TaskTypeBadge` / `BoardColumn`'s config so the **label** comes from i18n (`t(\`Enums.TaskSize.${size}\`)`, `Enums.TaskType`, `Enums.TaskStatus`, `Enums.PlanMode`) while styling stays in code. `SIZE_TO_POINTS` (numeric) is untouched
  - **Component literals** (`Board`, `TaskModal`, `Settings`, `Plan`, `Review`, `AiChat`): board (`BoardHeader`, `ProgressDashboard`, `BoardColumn`, `TaskCard`, `EmptyBoard`, `SettingsContent`), task modal, plan form/template/review modal, and the remaining ai-chat inline strings/aria-labels now read via `useTranslations`. Hand-written plural/interpolation (`${n} template${n===1?'':'s'}`, count summaries, mode/instance messages) converted to **ICU** (`plural` / `select`); `CreateActionBar`'s highlighted counts use `t.rich`
  - **Server-side** (`Errors`, `Validation`, `Metadata`, `AiChat`): action error strings via `getTranslations("Errors")`; root `metadata` → `generateMetadata` with `getTranslations("Metadata")`; `plans/layout` "Planning Mode"/title via `getTranslations`; AI welcome message + suggestion chips moved to i18n (`AiChat.welcome*`, chip key lists resolved server-side in `aiChatService` and client-side in `useAiPlanChat`/`reconstructMessages`)
  - **zod validation messages** (`Validation`): centralized in `en.json`, read in `schemas.ts` via a direct `en.json` import (zod runs at module load, no React context). Single-locale today; per-locale validation would translate at the form boundary
  - **Not translated** (intentional): `prompt/*.ts` LLM instructions, internal `throw new Error(...)`, the `Chat` DB title, routes, and `SIZE_TO_POINTS`. `loading.tsx` column names are React keys (not rendered), left as-is
  - `EmptyBoard` is a Client Component (it renders inside the client `/design` gallery as well as the server board page). Added an `AGENTS.md` convention: kanban user-facing copy uses `next-intl`, not `constants.ts`
- Refined the i18n migration per PR #6 review: collapsed `Enums.SizeEffort` (5 strings) into one `Enums.sizeEffort` with the hours interpolated (ICU plural; hours = `sizeToPoints`); removed the `userAvatarInitial` key (the avatar monogram is a fixed glyph, hardcoded in `Avatars`); moved the `⚠`/`‼` risk-badge glyphs out of `Board.Card` copy into the JSX and folded `BacklogSheetCard`'s previously-inline risk badges onto the shared `Board.Card` keys; replaced the `t(\`submit.${mode}\`)` / `t(\`header.${mode}\`)` template-string keys in `TaskModalFooter`/`Header` with explicit config maps of static keys. Split the two `AGENTS.md` coding conventions cleanly — `constants.ts` now covers fixed **non-user-facing** literals only (routes / numbers / style tokens), and the i18n rule owns **all user-facing copy**

### 2026-06-29
- Added the **returning-user empty board**: when a plan's period has ended (`PENDING_UPDATE`), the board now shows a "Plan period ended" recap with last period's completion %, tasks done, and points earned — distinct from the new-user "No active plan" screen. New `boardService.getEmptyBoardState` + `getEmptyBoardStateAction` resolve new-vs-returning from the pending plan; the stats reuse the existing per-template aggregate via a shared `utils/statsUtils.rollUpOverall` (extracted from `aiChatService` so the board doesn't pull in the LLM module). `EmptyBoard` now takes optional `stats` and renders both variants (copy in a colocated `emptyBoardConstants.ts`); the `/design` gallery shows both
- Built the **AI Assisted Plan Creation UI** (backend was already done): a Zustand chat store (`store/aiPlanChatStore`, pure state) + a `hooks/useAiPlanChat` bridge that calls the existing server actions (keeps fetch out of the store), and the `components/ai-chat/` modal — `AiPlanChatModal` (header/body/footer render-function split), `ChatMessage`, `DraftPlanCards` (reuses `SizeChip` + `TaskTypeBadge`), `SuggestionChips`, `ChatInputBar`, `CreateActionBar`, `CreatedBanner`, `LoadingBubble` (shown for both `initializing` and `generating`), shared `Avatars`, and a `constants.ts` for all UI copy
- Entry point: `AiAssistantBanner` rendered in `PlanForm` after the description (create mode only); `new/page.tsx` passes the pending plan id as `aiContextPlanId` to seed the returning-user welcome
- Added two `AGENTS.md` conventions: split modal header/body/footer into render functions, and extract user-facing literals into a colocated `constants.ts`
- Fix: regenerated the stale Prisma client (`npx prisma generate`) so `Chat.planId` is recognized at runtime
- Made the AI chat **durable**: the DB chat row is the source of truth — on open it resumes the user's most recent unapproved chat (new `getActiveAiChatAction` + `getLatestInProgressChat` DAL → rehydrate messages/draft) across modal close, reload, and app restart, and **auto-resumes** a generation interrupted mid-run (new `resumeDraftPlanAction`; `generateDraftPlan` refactored to share a `generateFromHistory` core, so resume adds no duplicate user turn). Approval sets `Chat.planId`, ending the chat so the next open starts fresh
- Refactor: `schemas.ts` now uses the client-safe `utils/enums.ts` (added `MessageRole`/`MessageType` mirrors) instead of the Node-only generated Prisma client, so chat schemas/reconstruction can be imported from client code
- Implemented the **Backlog drawer** end-to-end: new `BACKLOG` `TaskStatus` (migration `add_backlog_task_status`); template instances now generate as `BACKLOG` (plan create/update, daily sync, AI approval — all via `planService.generateTasksForTemplates` + `runDailySync`); a desktop-only right-edge `BacklogDrawer` (drag `BACKLOG → TODO`, no un-pull guard); `TaskCard` reused with a new `#n` instance badge shown when template `frequency > 1` (threaded via `templateFreqMap`); `computeRiskLevel` treats `BACKLOG` as `TODO` so risk + rollover stay in sync; `fetchBoard` excludes backlog from Today totals while Week projection (DB aggregate) still counts it; plan-edit removal now also targets `BACKLOG` instances. Mobile drawer deferred.
- Made the drawer a flush full-height right sidebar — moved the board padding off the page wrapper onto the columns area only
- Reorganized `components/` into `kanban/` (board), `plan/` (plan page + `ai-chat/`), and `shared/` (`SizeChip`, `TaskTypeBadge`, `task-modal/`); `SettingsContent` stays at root. Backlog-drawer copy now lives in `kanban/constants.ts`
- Synced design docs: `baseline.md` (added `BACKLOG`; moved Backlog drawer + LLM-assisted plan creation to **Implemented V2**), `flows.md` (new **Backlog Drawer Flow** + edits to Daily Sync / Create & Update Plan / Drag-and-Drop / Progress Tracking), `api.md` (Today totals exclude backlog, `(BACKLOG, TODO, DOING)` status sets, `updateTaskStatusAction` serves the pull)
- Added a **component gallery** at `/design` (`src/app/design/`): renders the presentational primitives with sample fixtures and a light/dark toggle (scoped via `data-theme` on a wrapper, so it doesn't fight the time-based `ThemeProvider`); `TaskCard` shown across default / at-risk / urgent / rollover / multi-instance / done states inside a minimal drag context
- Made the app shell conditional: extracted the sidebar/bottom-tab wrapper from the root layout into a client `AppShell` (`components/common/AppShell.tsx`) that hides the chrome on `CHROMELESS_PREFIXES` (`/design`), so the gallery renders standalone; root layout still fetches the user once and passes it through
- Board UI polish pass (six fixes): Done cards are no longer draggable out of the column (still a valid drop target); during a drag every droppable column shows a faint dashed outline and the hovered one a solid dashed highlight (matches the drop-target mockup); fixed the column header accent colors (Todo/In Progress/Done left borders were being overridden to grey by a responsive base-color class — now left = accent, bottom = base via separate longhand classes); fixed task-card left borders (normal cards were given a transparent 4px left edge, hiding the border — now they keep the base 1px edge and risk cards override with their color); backlog cards now group by template and sort by instance index (leetcode #1, #2, workout #1, #2) instead of interleaving by createdAt; the backlog drawer open/collapse now cross-fades both states while the width animates (same technique as the app sidebar) instead of swapping content instantly

### 2026-06-27
- Removed the unreachable standalone AI chat demo (pages, `/api/chats` + `/api/llm` routes, `features/chat/`, old `chats.ts`/`messages.ts` DAL); kept the shared `Chat`/`Message` tables for reuse
- Completed the **entire backend** for AI Assisted Plan Creation (UI still to come): migration adds a `MessageType` enum + links chats to plans, plus per-template stats aggregation snapshotted into `Chat.metadata`
- `createAiChatAction` — bootstraps the chat with an instant static welcome + suggestion chips (no LLM latency)
- `generateDraftPlanAction` — OpenAI `gpt-5-nano` structured-output draft generator: reuses existing templates, calibrates from last period's per-template stats, replays prior drafts as conversation history, and stores each draft as a `DRAFT_PLAN` message + a single-slot `Chat.metadata.latestDraft` approval clipboard
- `approveDraftPlanAction` — commits the approved draft to a real plan in one atomic transaction: batch-creates the draft's new templates, builds the plan (reusing the create-plan core, extracted as `createPlanInTx`), completes the prior `PENDING_UPDATE` plan, carries over its non-done ad-hoc tasks, and uses the LLM's summary as `Plan.description`
- Each step verified end-to-end against live OpenAI + DB
- Fixed a `set-state-in-effect` lint error in `TaskModal` (form reset → render-phase state adjustment)
- Synced design docs (`api.md`, `baseline.md`, `flows.md`) and `AGENTS.md`

### 2026-06-22
- Enabled real per-user data isolation for kanban. Added `getCurrentUserId()` helper (`src/lib/auth/getCurrentUserId.ts`) and threaded `userId` through the kanban DAL/services/actions/pages; reads filter by `userId`, creates stamp it, and id-based writes enforce ownership via `updateMany`/`updateManyAndReturn` on `{ id, userId }`
- Added `user_id` to `tasks` (migration `20260622060000`), backfilled all existing rows under the single user, cleared the deprecated `chats`/`messages` tables, then enforced `user_id NOT NULL` on `plans`/`task_templates`/`tasks` (migration `20260622070000`)
- Closed the orphaned ad-hoc task gap: `getNonDoneAdhocTasks` is now user-scoped, so unlinked (`plan_id = null`) tasks stay isolated per user

### 2026-06-03
- Redesigned sidebar from feature-level nav (Chat/Kanban) to workspace nav (Board/Plan)
- Board nav disabled with tooltip when no active plan; Plan shows "New" nudge badge
- Removed Edit Plan button from board header (Plan entry now in sidebar)
- Merged `mockup-empty.html` into `mockup-board.html` (3 screens: Board, No Plan, Returning User)
- Updated all mockup sidebars to workspace layout; removed Matrix and Settings nav items
- Added disabled item, tooltip, nudge badge, coming-soon styles to `styles.css`
- Deleted `tmp-topbar-redesign.html` temp file
- Updated `baseline.md`: moved Mobile Kanban + PWA and Workspace Sidebar to Implemented V2
- Redesigned sidebar from feature-level nav (Chat/Kanban) to workspace nav (Board/Plan) with disabled state and nudge badge

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
- Added light/dark theme toggle to login and sidebar mockups via shared `mockup-theme.css`
- Converted all hardcoded colors in sidebar mockup to theme variables

### 2026-03-08
- Fixed timezone bug causing false end-of-period sync: `getISOWeekKey()` used UTC methods while `getTodayDate()` used local time, producing mismatched week keys near week boundaries
- Anchored all date calculations to `America/Los_Angeles` timezone via `KANBAN_TZ` constant and `Intl.DateTimeFormat`, ensuring consistent "today" on both local dev and Vercel (UTC) deployments
- Collapsible app sidebar with feature navigation, sign-out, and directional cursor feedback
- Fixed collapsed sidebar gap: "Features" label now collapses to zero height (no layout shift)
- Synced sidebar mockup with code (icon, nav labels, cursors) and cleaned up before/after to source-of-truth
- Login page with Google OAuth, theme-aware styling, Vercel deployment

### 2026-03-06
- Connected to Supabase database and migrated all data from local PostgreSQL
- Designed auth flows (login, sign-up, sign-out, route protection) and finalized design docs
- Created login screen mockup (`mockup-login.html`)
- Installed `@supabase/supabase-js` and `@supabase/ssr`
- Created Supabase client utilities (`src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`)
- Created OAuth callback route handler (`src/app/auth/callback/route.ts`)
- Created route protection proxy (`src/proxy.ts`) — redirects unauthenticated users to `/auth/login`
- Configured `prisma.config.ts` to use direct connection for CLI operations

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
- Scaffolded auth feature: folder structure, design doc templates, README

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
