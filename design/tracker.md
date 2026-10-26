# Tracker

Single source of truth for open ideas and todos across the app — open items only; completed work is recorded in the root `README.md` Update Log, not here.

## Conventions

- **One concise line per item; details go into sub-bullets.** An item says what is open and why, at product altitude — not an inventory of files or components.
- **Finished work leaves.** Delete an item or sub-bullet when it lands — don't keep it checked; the Update Log records it.
- **A multi-PR project is one item with a sub-bullet per step.** The parent line names the goal and links the spike and mockups; each sub-bullet is one PR or step, kept to one line. Delete a sub-bullet when its PR lands, and the parent goes with the last one. Bad: five unrelated top-level items ("Projects PR 1", "Projects PR 2", …), or one parent whose prose lists every PR in a paragraph. Good: `- [ ] Week model Phase 1 — Projects MVP: … Spike … (approved)` followed by `  - [ ] PR 1 — Phase 1 docs: …`, `  - [ ] PR 2 — kind-first cards, risk off, …`.

## Board

### Medium

- [ ] Stack duplicate habit instances in the backlog — the kind-first card has landed; PR #44 implements stacking on the old card and needs moving onto the new face (project steps and one-offs never stack)

### Future

- [ ] Per-kind risk rules — Phase 1 switched risk off (badges, borders, 15:00 / 20:00 clock thresholds); bring it back per kind, as a colour on the card's signal line (never the kind edge): habit pace (amber when what's left needs every remaining day), project step carried 2× (amber — split it?), one-off due date (amber within 2 days, red on the day — the only red). First explored in PR #47's initial mockup (commit `d3ecc25`, Cards & risk screen)

## Plan

### Medium

- [ ] Edit Plan still saves its full template list: a habit Claude adds or changes on the active plan while the form is open is undone on save (removed, or its type / frequency reverted). One-offs and steps no longer have this problem — the form sends only what was let go; pinned by an `it.fails` test in `planService.int.test.ts`, to flip when fixed
- [ ] Tune the MCP planning guide after 2–3 weeks of using PR 5 — note where Claude went wrong (habit vs project, overlap questions, focus check, step order) and adjust the guide
- [ ] Clean up stale task templates on the owner's account — a `scripts/one-time/` script; archive or delete is decided when it's picked up (templates used by a plan can't be deleted without its history)
- [ ] ReviewChangesModal / OverlayShell body height needs tuning on **both** breakpoints — with long change lists the box grows so tall the header ends up out of view; revisit the max-height caps (mobile `max-h-[85vh]`, desktop `md:max-h-[calc(100vh-5em)]`) so the pinned header/footer always stay on screen

### Future

- [ ] Week model Phase 2 (not planned yet; starts after Milestone — Quality gate before Phase 2, Cross-cutting) — habits own their cadence (Daily = every day, or N× per week; Plan Mode dropped) with a Plan › Habits page; a three-step Plan week replaces the plan form, with one Plan hub header for This week · Habits · Projects (Phase 1 keeps the plan form as it was and gives Projects its own page and nav entry); Done becomes the week's day-grouped log and cards get a ✓; cleanup of `DOING` and `Plan.mode`. Mockup `design/mockup/mockup-week-model-phase2.html`
  - [ ] Plan week built on the page structure (AGENTS.md › Layers › *Page structure*): route adapter for the form's initial selections, a `PlanPage` container with a page context, the diff as a pure helper — the plan form keeps its current structure until then (`design/spike/component-structure.md`, Q5)
  - [ ] Redesign the Review changes modal — large as it stands; rework it with the Plan week
  - [ ] UI component tests (React Testing Library or Vitest browser mode), and a second look at visual regression on the Design Console scenarios — deferred from the Quality gate's test baseline until Phase 2's pages settle (`design/spike/archived/test-baseline.md`, Q10)
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

- [ ] Milestone — Quality gate before Phase 2: settle the mutation layer and component structure before Phase 2 and Daily rhythm start, so their new pages are built the new way. One sub-bullet per open step of the planner project *Mars Workbench — Phase 2 前的代码质量*, in its order and numbered as there
  - [ ] Step 10 — Component structure + config-driven modals, spike + implementation: settles how Phase 2's new pages (Habits, Plan week) are written
    - [ ] Page structure for the other pages (one PR) — Board, Priorities and Dump move onto the Projects page's structure (AGENTS.md › Layers › *Page structure*; spike `design/spike/component-structure.md`), built through the Q9 comparison below
      - Q9 comparison, start here — a fresh session on `main` after PR #83 is the controller: it follows `design/spike/component-structure-experiment.md` › 6 step by step — six isolated run sessions from one commit (serial A1–A3, parallel B1–B3), six blind reviews, then the report and the owner's pick of the PR to merge; it changes no run's code
      - Board — `BoardPage` absorbs `BoardScreen`; the mobile pull through a page context
      - Priorities — `PrioritiesPage` absorbs `PrioritiesScreen`; track, complete, the popover and add through a page context (quadrant cell and card: 9 props → 2); the route's week fallback becomes an adapter
      - Dump — `DumpPage` with capture and load-more through a page context; the route's unwrapping becomes an adapter
    - [ ] Config-driven modals on the page structure (scope TBD: one PR or more) — one `useModal` + a registry mapping each modal to its form, schema, action and success effect, since the form modals share one flow (input → server action → close); covers where open state lives (store / context / URL), on top of the shared `useModalSubmit` (closes once the page's fresh data lands). Initial findings (modal inventory, shared flow, a `useModalSubmit` core, why shell and form are split) in `design/spike/archived/projects-page-refactor.md`
      - Close on React's transition (owner's call) — close inside the action's transition on `useTransition`'s pending state, instead of waiting for the revalidated props (`useWaitForFreshData`). It hung about 1 in 3 first writes on Next 16.2.9 and none of 155 on 16.4.3; the Projects page's URL changes (new / archive project) must then wait for the commit, since `pushState` during an in-flight action is an open upstream bug (vercel/next.js#100489). Findings in `design/spike/archived/mutation-layer.md` › 追记
  - [ ] Step 11 — Close out: living docs and tracker, then open the Phase 2 project
  - [ ] Step 12 — Error handling: the plumbing first, one spike and one PR per topic, then the presentation per flow
    - Shared server-action handler — most actions repeat parse → `getCurrentUserId` → service → `revalidatePath` → map errors to `Errors.*`; explore a config-driven wrapper (schema, revalidate paths, error map)
    - Error-handling plumbing — PR #32's spike (`design/spike/error-handling.md`, awaiting review, written before Phase 1): services mix returned `{error}` shapes with thrown errors (`TemplateNotFoundError`, plain `Error`); one typed-error pattern mapped per surface (forms, MCP)
    - Error presentation — one error language (tone, copy, placement, visual treatment) applied per flow, from PR #32's mockups as the plumbing spike decides
      - [ ] Plan form — create/update submit failures (`FormErrorAlert` banner above the actions)
      - [ ] Task modal — template create/edit and priority-task add failures (footer `FormErrorAlert`)
      - [ ] Board — drag/status-update failures (currently silent optimistic rollback + `console.error`)
      - [ ] Priorities — reprioritize / track / complete / undo failures (currently silent optimistic rollback + `console.error`)
      - [ ] Projects — archive / unarchive and optimistic step writes (+ This week, ×, reorder) fail silently (rollback + `console.error`)
      - [ ] Auth — OAuth sign-in failure surface (none today; login just returns to the button)
      - [ ] Pages — no `error.tsx` / `not-found.tsx`; a server throw lands on Next's default error page
  - [ ] Step 13 — Quality sweep: a `/quality-sweep` skill (the checklist, versioned in the repo, also run by hand at each milestone's end) and a Routine that runs it every two weeks in a fresh session. It covers only what CI can't: docs vs code (tracker, README Current State, `reference.md`, flows, scenarios), conflicts between rule files (AGENTS.md and the READMEs it indexes) and stale temporary exceptions, AGENTS.md's size and growth and its index matching the READMEs it points to, stale PRs / spikes / mockups, duplicated logic and drifting patterns, dependency updates and `npm audit`, growing hotspot files. It opens one PR with tracker edits and a short report of at most 5–10 findings, each ending as fixed, a tracker item, a new CI rule, or dismissed with a reason; findings a machine can check become CI rules.
  - [ ] Step 14 — Code review agent: scope not written yet; settled when the step is picked up
- [ ] Persist sidebar collapse state across page refreshes (localStorage with SSR hydration)
- [ ] Daily rhythm — Open / Close-the-day rituals and phone notifications for unfinished tasks; starts after the Quality gate milestone. Spike `design/spike/daily-rhythm-notifications.md` in PR #33 (awaiting review, written before Phase 1); when picked up, regroup its sheets by kind, map "Still on it" to staying in Todo (the board has no Doing column), and re-derive the midday nudge's triggers (it keys off the risk clock and In Progress cards, both gone)

### Medium

- [ ] First visit of a page still shows its skeleton for ~310 ms: once `loading.tsx` is up, React holds the content back 300 ms, while the data now arrives in ~30–85 ms locally (`design/spike/archived/mutation-layer.md`, Q4). Measure on production, then decide per page whether to drop the skeleton for a pending state on the link
- [ ] Measure `ci-fixer` on the next red GitHub CI: delegate the failing job to it and compare the main-session context with reading the log inline; if it still comes out even, drop the agent (`design/spike/archived/subagent-delegation-pilot.md` › Decision, Q2)
- [ ] `ui/` component-structure lookup in `reference.md` — a lean high-level map for agents (humans use the `/design` gallery); follow-up to the landed component library
- [ ] Uniform page header across board / priorities / projects / dump / settings on both breakpoints (plan keeps its planning-mode header until Phase 2's Plan hub header); also resolves the BoardHeader green-vs-primary accent drift and revisits the mobile header type scale (current mobile header font size reads too large). Along the way (`design/spike/archived/board-prop-drilling.md` Part 2): fold BoardHeader's extra wrapper div, drop the needless `'use client'` from `BoardHeader` / `ProgressDashboard`, and redraw the stale `kanban/loading.tsx` skeleton
- [ ] Redesign the point system and metric tracking — how sizes map to points, and what the board's Today / Week / Daily avg metrics count now that a week mixes habits, project steps and one-offs (PR 3 only added a project bucket to the week projection). Direction proposed in `design/spike/week-model-phase2-pain-points.md` (points → hours of a weekly budget)

### Future

- [ ] Cron-driven sync — move the daily / end-of-period sync to a scheduled job (e.g. Vercel Cron hitting a route just after midnight in `KANBAN_TZ`); pages keep the idempotent `ensureSynced` as fallback. `runDailySync` / `runEndOfPeriodSync` are already standalone for this
- [ ] User-configurable timezone — Date utils are currently anchored to `America/Los_Angeles` via `KANBAN_TZ` constant. Consider making this a user setting stored in the database for multi-user support or if the user relocates (traveling users)
- [ ] Custom domain — move off `*.vercel.app`; update Supabase Site URL + Redirect URLs. The MCP connector URL (and its protected-resource `resource`) is tied to the domain, so a switch means re-adding the connector in Claude
- [ ] Spike: leverage the UI flows table for all user actions — every user action that changes server state, per page, as one table row (entry point → server action → optimistic or not → what follows: selection, navigation, rollback); reference: the Interactions table in `design/spike/archived/week-model-pr4-projects-ui.md`. Decide where the tables live and backfill board, priorities, plan and dump
- [ ] Spike: type organization — shared types live in `src/types/`, DAL row types in `lib/db/*`, plus `z.infer` aliases and service-local types; propose where each kind lives and how it's named so types stay findable as the app grows
