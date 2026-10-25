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
  - [ ] Plan page follows the board's data split (`baseline.md` › Architecture Decision, *Server shapes inputs, the client derives the view*): the loader returns inputs, the page's container takes them as props with its optimistic writes on top and derives the view with a pure adapter — done alongside the Plan week rebuild
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

- [ ] Milestone — Quality gate before Phase 2: settle the mutation layer and component structure before Phase 2 and Daily rhythm start, so their new pages are built the new way. One sub-bullet per open step of the planner project *Mars Workbench — Phase 2 前的代码质量*, in its order and numbered as there. Order set 2026-10-25 (owner's call): component structure first, since it is under way; then the error-handling plumbing, the code review agent, the agent harness, the error presentation per flow, and close out. The quality sweep and the shared server-action handler wait until after the public launch (Cross-cutting › Future)
  - [ ] Step 10 — Component structure + config-driven modals, spike + implementation: settles how Phase 2's new pages (Habits, Plan week) are written
    - [ ] PR 1, component structure — re-evaluate app-wide when to split: presentational components only for pure display reused across features (cards, `Banner` + optional action); feature components with their own state and actions take domain data; no slot-only frames; code shaped for production, the Design Console adapts. Projects page is the pilot (`design/spike/archived/projects-page-refactor.md`); also settles AGENTS.md's *Screen components* vs *Production first* and the frames half of *Server shapes inputs*. Spike `design/spike/component-structure.md` (draft: each feature's current structure, no options yet)
      - Projects pilot exception until then — no screen layer: the route and the scenario render the same client `ProjectsPage`, which owns the state; its feature components (`ProjectList`, `ProjectDetail`, `ProjectStep`) take domain rows and derive what they show with pure helpers in `utils/projectUtils.ts`, with no frames or view-model tree
    - [ ] PR 2, config-driven modals on PR 1's rules — one `useModal` + a registry mapping each modal to its form, schema, action and success effect, since the form modals share one flow (input → server action → close); covers where open state lives (store / context / URL), on top of the shared `useModalSubmit` (closes once the page's fresh data lands). Initial findings (modal inventory, shared flow, a `useModalSubmit` core, why shell and form are split) in `design/spike/archived/projects-page-refactor.md`
      - Close on React's transition (owner's call) — close inside the action's transition on `useTransition`'s pending state, instead of waiting for the revalidated props (`useWaitForFreshData`). It hung about 1 in 3 first writes on Next 16.2.9 and none of 155 on 16.4.3; the Projects page's URL changes (new / archive project) must then wait for the commit, since `pushState` during an in-flight action is an open upstream bug (vercel/next.js#100489). Findings in `design/spike/archived/mutation-layer.md` › 追记
  - [ ] Step 12 — Error-handling plumbing: PR #32's spike (`design/spike/error-handling.md`, awaiting review, written before Phase 1): services mix returned `{error}` shapes with thrown errors (`TemplateNotFoundError`, plain `Error`); one typed-error pattern mapped per surface (forms, MCP)
  - [ ] Step 14 — Code review agent: scope not written yet; settled when the step is picked up (spike `design/spike/code-reviewer-agent.md` in PR #82). It is the review pass the agent harness (Step 15) runs before the owner's
  - [ ] Step 15 — Agent harness (the owner is thinking it over; a spike when picked up): Claude works a queue of well-specified tasks unattended, in parallel and overnight, and the owner's daily time becomes review and acceptance on the Vercel preview
    - Queue — one GitHub issue per task with its done-when criteria and a `ready` label; well-specified work (Step 16's per-flow items, a per-user timezone, a privacy page) runs end to end, design-heavy work (Plan week, Daily rhythm) comes back as a spike and mockup options only
    - Dispatch — a scheduled task that starts a fresh session per ready issue (nightly), or a few cloud sessions started in parallel each morning; each opens its PR, subscribes to it and drives CI green; the owner merges, never the agent
    - Owner's loop — the code review agent first, then the owner reviews the diff and the preview and comments, and the session wakes and fixes; open PRs capped at 2–3, since review speed is the throughput limit
    - Parallel friction to remove first — every PR rewrites the day's README Update Log section and edits the tracker, so same-day PRs always conflict (write the log once a day from merged PRs, or per-PR fragments); spike-first only for design-heavy tasks; a SessionStart hook or the environment's setup script warms Docker and the local Supabase stack
  - [ ] Step 16 — Error presentation: one error language (tone, copy, placement, visual treatment) applied per flow, from PR #32's mockups as Step 12's spike decides; each flow is one well-specified PR, the agent harness's first queue
    - [ ] Plan form — create/update submit failures (`FormErrorAlert` banner above the actions)
    - [ ] Task modal — template create/edit and priority-task add failures (footer `FormErrorAlert`)
    - [ ] Board — drag/status-update failures (currently silent optimistic rollback + `console.error`)
    - [ ] Priorities — reprioritize / track / complete / undo failures (currently silent optimistic rollback + `console.error`)
    - [ ] Projects — archive / unarchive and optimistic step writes (+ This week, ×, reorder) fail silently (rollback + `console.error`)
    - [ ] Auth — OAuth sign-in failure surface (none today; login just returns to the button)
    - [ ] Pages — no `error.tsx` / `not-found.tsx`; a server throw lands on Next's default error page
  - [ ] Step 11 — Close out: living docs and tracker, then put the Public launch milestone's first project (habits and the time budget, which opens Phase 2) on the planner
- [ ] Milestone — Public launch (after the Quality gate): finish the target state (habits with a weekly time budget, Plan week, a Today board with the daily rhythm), the basics strangers need (a per-user timezone, a privacy page, a connector setup guide), a new name and domain, then share it. Six projects, put on the planner one at a time when picked up; when they are, the Phase 2, Daily rhythm, Custom domain and User-configurable timezone items fold into it. Spike `design/spike/public-launch.md` (draft)
- [ ] Persist sidebar collapse state across page refreshes (localStorage with SSR hydration)
- [ ] Daily rhythm — Open / Close-the-day rituals and phone notifications for unfinished tasks; starts after the Quality gate milestone. Spike `design/spike/daily-rhythm-notifications.md` in PR #33 (awaiting review, written before Phase 1); when picked up, regroup its sheets by kind, map "Still on it" to staying in Todo (the board has no Doing column), and re-derive the midday nudge's triggers (it keys off the risk clock and In Progress cards, both gone)

### Medium

- [ ] First visit of a page still shows its skeleton for ~310 ms: once `loading.tsx` is up, React holds the content back 300 ms, while the data now arrives in ~30–85 ms locally (`design/spike/archived/mutation-layer.md`, Q4). Measure on production, then decide per page whether to drop the skeleton for a pending state on the link
- [ ] Measure `ci-fixer` on the next red GitHub CI: delegate the failing job to it and compare the main-session context with reading the log inline; if it still comes out even, drop the agent (`design/spike/archived/subagent-delegation-pilot.md` › Decision, Q2)
- [ ] `ui/` component-structure lookup in `reference.md` — a lean high-level map for agents (humans use the `/design` gallery); follow-up to the landed component library
- [ ] Uniform page header across board / priorities / projects / dump / settings on both breakpoints (plan keeps its planning-mode header until Phase 2's Plan hub header); also resolves the BoardHeader green-vs-primary accent drift and revisits the mobile header type scale (current mobile header font size reads too large). Along the way (`design/spike/archived/board-prop-drilling.md` Part 2): fold BoardHeader's extra wrapper div, drop the needless `'use client'` from `BoardHeader` / `ProgressDashboard`, and redraw the stale `kanban/loading.tsx` skeleton
- [ ] Redesign the point system and metric tracking — how sizes map to points, and what the board's Today / Week / Daily avg metrics count now that a week mixes habits, project steps and one-offs (PR 3 only added a project bucket to the week projection). Direction proposed in `design/spike/week-model-phase2-pain-points.md` (points → hours of a weekly budget)

### Future

- [ ] Quality sweep (after the public launch; was the Quality gate's Step 13) — a `/quality-sweep` skill (the checklist, versioned in the repo, also run by hand at each milestone's end) and a Routine that runs it every two weeks in a fresh session. It covers only what CI can't: docs vs code (tracker, README Current State, `reference.md`, flows, scenarios), conflicts between rule files (AGENTS.md and the READMEs it indexes) and stale temporary exceptions, AGENTS.md's size and growth and its index matching the READMEs it points to, stale PRs / spikes / mockups, duplicated logic and drifting patterns, dependency updates and `npm audit`, growing hotspot files. It opens one PR with tracker edits and a short report of at most 5–10 findings, each ending as fixed, a tracker item, a new CI rule, or dismissed with a reason; findings a machine can check become CI rules.
- [ ] Shared server-action handler (after the public launch; was part of the Quality gate's error handling) — most actions repeat parse → `getCurrentUserId` → service → `revalidatePath` → map errors to `Errors.*`; explore a config-driven wrapper (schema, revalidate paths, error map)
- [ ] Cron-driven sync — move the daily / end-of-period sync to a scheduled job (e.g. Vercel Cron hitting a route just after midnight in `KANBAN_TZ`); pages keep the idempotent `ensureSynced` as fallback. `runDailySync` / `runEndOfPeriodSync` are already standalone for this
- [ ] User-configurable timezone — Date utils are currently anchored to `America/Los_Angeles` via `KANBAN_TZ` constant. Consider making this a user setting stored in the database for multi-user support or if the user relocates (traveling users)
- [ ] Custom domain — move off `*.vercel.app`; update Supabase Site URL + Redirect URLs. The MCP connector URL (and its protected-resource `resource`) is tied to the domain, so a switch means re-adding the connector in Claude
- [ ] Spike: leverage the UI flows table for all user actions — every user action that changes server state, per page, as one table row (entry point → server action → optimistic or not → what follows: selection, navigation, rollback); reference: the Interactions table in `design/spike/archived/week-model-pr4-projects-ui.md`. Decide where the tables live and backfill board, priorities, plan and dump
- [ ] Spike: type organization — shared types live in `src/types/`, DAL row types in `lib/db/*`, plus `z.infer` aliases and service-local types; propose where each kind lives and how it's named so types stay findable as the app grows
