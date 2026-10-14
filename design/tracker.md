# Tracker

Single source of truth for open ideas and todos across the app — open items only; completed work is recorded in the root `README.md` Update Log, not here.

## Board

### Medium

- [ ] Stack duplicate habit instances in the backlog — the kind-first card has landed; PR #44 implements stacking on the old card and needs moving onto the new face (project steps and one-offs never stack)

### Future

- [ ] Per-kind risk rules — Phase 1 switched risk off (badges, borders, 15:00 / 20:00 clock thresholds); bring it back per kind, as a colour on the card's signal line (never the kind edge): habit pace (amber when what's left needs every remaining day), project step carried 2× (amber — split it?), one-off due date (amber within 2 days, red on the day — the only red). First explored in PR #47's initial mockup (commit `d3ecc25`, Cards & risk screen)

## Plan

### Medium

- [ ] Edit Plan still saves its full template list: a habit Claude adds or changes on the active plan while the form is open is undone on save (removed, or its type / frequency reverted). One-offs and steps no longer have this problem — the form sends only what was let go
- [ ] Tune the MCP planning guide after 2–3 weeks of using PR 5 — note where Claude went wrong (habit vs project, overlap questions, focus check, step order) and adjust the guide
- [ ] Clean up stale task templates on the owner's account — a `scripts/one-time/` script; archive or delete is decided when it's picked up (templates used by a plan can't be deleted without its history)
- [ ] ReviewChangesModal / OverlayShell body height needs tuning on **both** breakpoints — with long change lists the box grows so tall the header ends up out of view; revisit the max-height caps (mobile `max-h-[85vh]`, desktop `md:max-h-[calc(100vh-5em)]`) so the pinned header/footer always stay on screen

### Future

- [ ] Week model Phase 2 (not planned yet) — habits own their cadence (Daily = every day, or N× per week; Plan Mode dropped) with a Plan › Habits page; a three-step Plan week replaces the plan form, with one Plan hub header for This week · Habits · Projects (Phase 1 keeps the plan form as it was and gives Projects its own page and nav entry); the in-app AI chat is removed (AI planning goes through Claude + MCP); Done becomes the week's day-grouped log and cards get a ✓; cleanup of `DOING` and `Plan.mode`. Exploration `design/mockup/future-work/mockup-week-model-phase2-v2.html`
  - [ ] Plan page follows the board's data split (AGENTS.md › Layers, *Server shapes inputs, the client derives the view*): the loader returns inputs, the page's container keeps them as state and derives the view with a pure adapter — done alongside the Plan week rebuild
  - [ ] Redesign the Review changes modal — large as it stands; rework it with the Plan week
  - [ ] Investigate the app pain points before planning Phase 2 — a weekly time budget the LLM plans into (size as its estimate, points → hours), focus limits (habits per week, active projects) and one lifecycle for habits and projects (active / paused / completed). Spike `design/spike/week-model-phase2-pain-points.md` (draft)
- [ ] Habit-level days — let each habit run on weekdays, every day or custom days (after Phase 2 drops Plan Mode, Daily means every day)
- [ ] One entry for habits and projects together — a single page (Habits · Projects) with the same lifecycle filters, instead of projects having their own nav item and habits living in the plan form; options in `design/spike/week-model-phase2-pain-points.md`

## Priorities

### Medium

- [ ] Ad-hoc task deletion and auto-clear logic

### Future

- [ ] Optional due date on one-off tasks — set when adding or editing a priority task, shown on matrix and board cards; the one source of red once per-kind risk rules return (see Board › Future)
- [ ] Move-to popover on a card near the bottom of the viewport is cut off — the panel now escapes its quadrant's scroll clip (fixed at its static position, no portal) but cannot flip upward; revisit with CSS anchor positioning (`position-try-fallbacks: flip-block`)

## Dump

### Future

- [ ] Entry edit + delete (V1 is append-only)
- [ ] Full-text search across entries
- [ ] PWA "New entry" shortcut / share-target for one-tap capture from the home screen

## Auth

### Future

- [ ] Connected apps in Settings — list and revoke the user's OAuth grants (Supabase `listGrants` / `revokeGrant`); today a grant can only be revoked from the Supabase dashboard, so the consent page doesn't promise revocation
- [ ] User profile/settings page
- [ ] Postgres Row-Level Security (RLS) policies (`using (user_id = auth.uid())`) as DB-level defense-in-depth beneath the app-layer userId scoping. Needs Prisma↔Supabase JWT plumbing (per-request `SET` of claims, or a JWT-aware connection role)

## Cross-cutting

### High

- [ ] Persist sidebar collapse state across page refreshes (localStorage with SSR hydration)
- [ ] Daily rhythm — Open / Close-the-day rituals and phone notifications for unfinished tasks; kept out of the restructure's scope. Spike `design/spike/daily-rhythm-notifications.md` in PR #33 (awaiting review, written before Phase 1); when picked up, regroup its sheets by kind, map "Still on it" to staying in Todo (the board has no Doing column), and re-derive the midday nudge's triggers (it keys off the risk clock and In Progress cards, both gone)

#### Design error states

Error presentation is unstyled or ad-hoc across the app; design one error language (tone, copy, placement, visual treatment) and apply it per flow. Spike + mockups in PR #32 (`design/spike/error-handling.md`, awaiting review, written before Phase 1) — it also covers the service-side conventions (returned `{error}` shapes mixed with thrown errors → one typed-error pattern mapped per surface):

- [ ] Plan form — create/update submit failures (`FormErrorAlert` banner above the actions)
- [ ] Task modal — template create/edit and priority-task add failures (footer `FormErrorAlert`)
- [ ] Board — drag/status-update failures (currently silent optimistic rollback + `console.error`)
- [ ] Priorities — reprioritize / track / complete / undo failures (currently silent optimistic rollback + `console.error`)
- [ ] Projects — archive / unarchive and optimistic step writes (+ This week, ×, reorder) fail silently (rollback + `console.error`)
- [ ] Auth — OAuth sign-in failure surface (none today; login just returns to the button)
- [ ] Pages — no `error.tsx` / `not-found.tsx`; a server throw lands on Next's default error page

### Medium

- [ ] Remove dead code — exports nothing calls: `projectService.listProjects` / `getProject`, unused `tasks.ts` exports (`getTasksByPlanId`, `getTasksByPlanIdAndStatus`, `getDailyTasksForDate`, `taskExists`, `countTasksByTemplateIds`, `isValidTaskStatus` with `VALID_TASK_STATUSES`), `deletePlanTemplatesByPlanId`, `sameDay`, `getTemplateStatsAction`, `DUMP_HREF`, plus the unused `en.json` keys `Review.templateCount` and `Dump.loadingMore`. `npx knip` lists them (with `DIRECT_URL` set); decide whether it joins CI
- [ ] `ui/` component-structure lookup in `reference.md` — a lean high-level map for agents (humans use the `/design` gallery); follow-up to the landed component library
- [ ] Uniform page header across board / priorities / projects / dump / settings on both breakpoints (plan keeps its planning-mode header until Phase 2's Plan hub header); also resolves the BoardHeader green-vs-primary accent drift and revisits the mobile header type scale (current mobile header font size reads too large). Along the way (`design/spike/archived/board-prop-drilling.md` Part 2): fold BoardHeader's extra wrapper div, drop the needless `'use client'` from `BoardHeader` / `ProgressDashboard`, and redraw the stale `kanban/loading.tsx` skeleton
- [ ] Spike: state management — React Query and / or Zustand in place of each page's hand-rolled client copy (`useOptimisticTasks` + effect sync, `revalidatePath` re-renders); also trim server actions (7 of 35 are reads), server ↔ UI shape conversion per fetch / mutate use case, URL query params as state, and the close-then-stale gap (a form modal closes once its action resolves, but the new data shows only after the `revalidatePath` re-render lands — Projects tried closing in a nested transition (spike Option 0) and dropped it: on Next 16.2.9 / React 19.2 it sometimes never commits, leaving the modal loading). First assessment in `design/spike/archived/projects-page-refactor.md`; pairs with the shared server-action handler spike
- [ ] Spike: config-driven modals — one `useModal` + a registry mapping each modal to its form, schema, action and success effect, since the form modals share one flow (input → server action → close); covers where open state lives (store / context / URL) and the close-then-stale gap every form modal has (see the state management spike). Initial findings (modal inventory, shared flow, a `useModalSubmit` core, why shell and form are split) in `design/spike/archived/projects-page-refactor.md`; pairs with the state management spike
- [ ] Spike: component structure — re-evaluate app-wide when to split: presentational components only for pure display reused across features (cards, `Banner` + optional action); feature components with their own state and actions take domain data; no slot-only frames; code shaped for production, the Design Console adapts. Projects page is the pilot (`design/spike/archived/projects-page-refactor.md`)
- [ ] Redesign the point system and metric tracking — how sizes map to points, and what the board's Today / Week / Daily avg metrics count now that a week mixes habits, project steps and one-offs (PR 3 only added a project bucket to the week projection). Direction proposed in `design/spike/week-model-phase2-pain-points.md` (points → hours of a weekly budget)

### Future

- [ ] Cron-driven sync — move the daily / end-of-period sync to a scheduled job (e.g. Vercel Cron hitting a route just after midnight in `KANBAN_TZ`); pages keep the idempotent `ensureSynced` as fallback. `runDailySync` / `runEndOfPeriodSync` are already standalone for this
- [ ] User-configurable timezone — Date utils are currently anchored to `America/Los_Angeles` via `KANBAN_TZ` constant. Consider making this a user setting stored in the database for multi-user support or if the user relocates (traveling users)
- [ ] Custom domain — move off `*.vercel.app`; update Supabase Site URL + Redirect URLs. The MCP connector URL (and its protected-resource `resource`) is tied to the domain, so a switch means re-adding the connector in Claude
- [ ] Separate dev environment, including the DB — local dev currently shares the production Supabase project (data, Auth config, single Site URL); set up a dev Supabase project or branch + env vars so local work and write-tool testing never touch prod data
- [ ] Spike: shared server-action handler — most actions repeat parse → `getCurrentUserId` → service → `revalidatePath` → map errors to `Errors.*`; explore a config-driven wrapper (schema, revalidate paths, error map). Pairs with the error-handling spike (PR #32, see Design error states)
- [ ] Spike: leverage the UI flows table for all user actions — every user action that changes server state, per page, as one table row (entry point → server action → optimistic or not → what follows: selection, navigation, rollback); reference: the Interactions table in `design/spike/archived/week-model-pr4-projects-ui.md`. Decide where the tables live and backfill board, priorities, plan and dump
- [ ] Spike: type organization — shared types live in `src/types/`, DAL row types in `lib/db/*`, plus `z.infer` aliases and service-local types; propose where each kind lives and how it's named so types stay findable as the app grows
