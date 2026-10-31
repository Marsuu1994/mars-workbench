# Tracker

Single source of truth for open ideas and todos across the app — open items only; completed work is recorded in the git history and PR descriptions, not here.

## Conventions

- **One concise line per item; details go into sub-bullets.** An item says what is open and why, at product altitude — not an inventory of files or components.
- **Finished work leaves.** Delete an item or sub-bullet when it lands — don't keep it checked; the PR that landed it records it.
- **A multi-PR project is one item with a sub-bullet per step.** The parent line names the goal and links the spike and mockups; each sub-bullet is one PR or step, kept to one line. Delete a sub-bullet when its PR lands, and the parent goes with the last one. Bad: five unrelated top-level items ("Projects PR 1", "Projects PR 2", …), or one parent whose prose lists every PR in a paragraph. Good: `- [ ] Week model Phase 1 — Projects MVP: … Spike … (approved)` followed by `  - [ ] PR 1 — Phase 1 docs: …`, `  - [ ] PR 2 — kind-first cards, risk off, …`.

## Harness engineering

How agents work on this repository: the experiments under `experiments/` (rules in its AGENTS.md) and the rules they settle. The owner's priority while the series runs (2026-10-28); the product milestones below resume after it.

### High

- [ ] Harness engineering series — explorations run as experiments (instruction → runs → report), in the order listed here; the execution plan, what each needs first and where every tool and dataset lives: spike `design/spike/experiment-setup.md`; a conclusion that changes how we work lands in AGENTS.md or the README it indexes
  - [ ] Setup, before the next try (spike `design/spike/experiment-setup.md`, decided) — the budget and roles every try follows: the owner starts a try at a fresh usage window; runs all at once in it; the controller compacts and wakes at the reset, starts every reviewer at once (at most ten), alone; then scripts for everything mechanical and judgment subagents in waves sized from measured unit costs (try2's report › 方法上的教训); an archive that keeps measurements and a high-level instruction rather than run code
    - [ ] `experiment-controller` skill — the controller notes (now `protocol/controller-notes.md` on `controller/try2` of the lab repository) become `.claude/skills/experiment-controller/` in this repository, invoked only by name (`disable-model-invocation`); scripts do every mechanical step — session usage, transcript usage / timeline / process counts, the checklist items git can decide (props, renames, deletions, callback props, commit shape), review branches, behavior checks, and a window budget (what this try has spent since the window opened, plus a planned phase at measured unit costs, against the window; `rate_limit_info.status` turns `allowed_warning` before `rejected` — seen on 2026-10-27: the one review that finished reported it while the other nine stopped on `rejected` — so a wave starts only on `allowed`) — and leave the model only the judgment calls; a try's base branch drops the skill like it drops `experiments/`, so runs and reviewers never see it; its own PR, after try2 wraps up
    - [ ] Evals repository `mars-workbench-evals` (the owner creates it, 2026-11-01) — the datasets that outlive a try: one case per task (task, base ref, implementations and how each was produced, adjudicated ground truth, checks), copied from the try's lab repository; v1 is the page-structure case (try1's six and try2's ten implementations, ground truth adjudicated once from their reviews and checklists). When a try's data enters it: `experiments/AGENTS.md`
  - [ ] 3 · Code review agent — is one needed, and what would it catch that CI and the owner's review don't? Context: the blind reviews so far (Fable, 16 across try1 and try2) barely separated candidates (26–29/30, correctness 5 in every one, no blocker); what paid off was their defect lists, whose repeats across ten runs became the item below; Quality gate › Step 14 is this item
    - [ ] Reviewer model on the evals page-structure case — the same ten try2 diffs reviewed with Fable, Opus, Sonnet and Haiku (start with Opus and Sonnet; add Haiku if Sonnet holds): recall against the adjudicated ground truth, precision by adjudication, cost per review (Fable measured $3.6–4.7). Hypothesis: Opus is enough for rule defects. It is layer 1 of PR #82's eval strategy
  - [ ] 2 · A standard workflow per phase — which model and effort for a spike, for implementation, for review; judged by cost per completed task, not per token
    - Context (2026-10-28): the proposed tiering is Opus for spikes, Fable for large novel work (effort high, alone in a window), Sonnet for implementation. Sonnet 5.5 is positioned for agentic coding in a real repository and Opus for the hardest long-horizon work; this repository's safety net (spike first, AGENTS.md, CI with coverage floors and e2e, owner review) is what makes a cheaper implementer viable, and what it would miss are the judgment items CI can't check (naming, DRY, layer placement, docs altitude)
    - Economics: in these sessions cache reads are over half the cost and cost the same on Opus and Sonnet, so Sonnet saves about a quarter at equal token counts; Opus at lower effort may be the cheaper cell, and the cost guidance is to sweep effort before changing the model (a model swap without an eval is the riskiest change); Sonnet at low effort sometimes skips the verifying check, so medium or high
    - First measurement, on the evals page-structure case after 3's reviewer measurement: try2's five Opus-high serial runs are the control cell; add three to five runs each of Opus low, Opus medium, Sonnet (medium or high) and Haiku (each effort needs its own base commit), judged by the reviewer 3 picks plus the checklist, behavior checks and CI. Hypothesis: Sonnet or Opus at low effort is enough for spec-settled implementation. It measures that tier only
  - [ ] 4 · Rules as the fix — do the rules added from recurring defects (*Rules the page-structure runs were missing*, below) stop those defects, or is a reviewer still needed for them? Once they land: the page-structure base `83ae5a4` plus one commit carrying the new rules, three to five serial runs on the same prompt, the same checklist and review prompt; try2's five serial runs are the control. Measure each defect class's rate against try2's (stale doc name 10 / 10, hand-copied action type 7 / 10, page-type naming or placement 10 / 10); about $55 in one window. Rules added all at once say whether the batch works, not which rule did
  - [ ] 1 · Parallel subagents on architecture-clear refactors — is the parallel worktree workflow a good idea once the design is settled? Serial vs parallel on time, tokens and quality (CI, checklist, behavior checks, blind review)
    - [ ] 1b · Error framework — the second task: Step 12's plumbing (shared action handler, typed errors per surface) as the refactor both workflows build, once its spike is approved; its error-path tests are written first and land on `main` as `it.fails`, the baseline both workflows turn green; if its runs catch real problems it becomes the evals repository's second case (a cross-cutting task, unlike page structure's per-page one; its base is a later `main`, so compare within the case, and run 4 first or say the new rules are in its base). Context: page structure closed with serial ahead in both tries (`experiments/page-structure-parallel/try2/report.md`) — a cold agent took as long for the largest page as one session for all three, so parallel needs blocks big enough to absorb that
  - [ ] 5 · Model for the quality sweep — Fable or Opus for Step 13's two-weekly sweep: both sweep the same `main` snapshot; the ground truth is the adjudicated union of their findings plus PR #82's golden set G4–G6. Hypothesis: Fable earns its cost here, on deeper new and legacy issues, not on per-PR review
  - [ ] 6 · Test first as the workflow — acceptance tests written before the code (as `it.fails`, flipped when the work starts), so red CI is the spec the implementer works against, against today's spike-only brief: fewer misreadings of the spec, at what cost in time. 1b is the first task built this way; a comparison needs the same task run both ways
- [ ] Rules the page-structure runs were missing — defects ten implementations each made because no rule or tool said otherwise (`experiments/page-structure-parallel/try2/report.md` › 反复出现的问题)
  - [ ] A page's input type is `<Feature>PageData` in `src/types/<feature>.ts`, built from DAL rows and returned by its service (AGENTS.md › Page structure)
  - [ ] A type for what an action returns is derived from the action or defined once in `src/types/`, never re-declared (AGENTS.md › General)
  - [ ] A check that every code name quoted in AGENTS.md and the READMEs it indexes still exists in `src/`
  - [ ] Prettier sorts Tailwind classes; one function style for helpers and handlers (lint)
  - [ ] Design Console: a desktop-only tab doesn't run its play step at phone width (it opens the mobile sheet)
- [ ] Rule priority in AGENTS.md — tag every rule with a severity level, and define each level, including how it ranks against the harness's own instructions (a cloud session's system prompt), so an agent facing a conflict knows which one wins instead of picking the more cautious side
  - Levels to define (draft): hard (never broken; blocked → ask the owner), default (followed unless the owner says otherwise in the conversation), preference (a judgment call the agent may weigh)
  - Example (2026-10-31, PR #101): the cloud session was assigned the random branch `claude/jolly-fermi-rohfgk` with "never push to a different branch without explicit permission", while AGENTS.md › Version Control says a remote session whose assigned branch is a random name creates a descriptive branch instead. The agent saw the conflict, ranked the harness's "never" above the repository rule and pushed to the random branch; the repository rule, written for exactly that case, was the owner's permission and should have won — the work moved to `claude/projects-archived-accordion`
- [ ] Docs split by reader — every folder with rules gets a `README.md` for people and an `AGENTS.md` (with a `CLAUDE.md` importing it) for agents, as `experiments/` does and the root README's *How docs are split* describes; one sub-bullet per folder, each moving its rules out of the README and pointing the root AGENTS.md's *Where the rules live* row at the new file
  - [ ] `design/spike/` — lifecycle, shape and archiving rules; add that a spike's open question outside its plan moves to the tracker, so the spike archives when its plan lands
  - [ ] `design/flows/` — how a flow doc is written
  - [ ] `design/` — the mockup rules and the docs index
  - [ ] `design/design-language/` — theme and visual-pattern rules
  - [ ] `src/app/design/` — Design Console scenarios, gallery and play steps
  - [ ] `test/` — test helpers and conventions
  - [ ] `design/tracker.md` — its Conventions section (a file, not a folder: decide whether it moves to `design/AGENTS.md`)
  - [ ] Root `AGENTS.md` — once every folder has moved, rewrite *Adding a rule* and *Where the rules live* for the new split

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
  - [ ] Plan week built on the page structure (AGENTS.md › Layers › *Page structure*): route adapter for the form's initial selections, a `PlanPage` container with a page context, the diff as a pure helper — the plan form keeps its current structure until then (`design/spike/archived/component-structure.md`, Q5)
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

- [ ] Milestone — Human readability: what the owner reads every day (PR descriptions, reports, docs) reads quickly and the same way each time
  - [ ] Rewrite the PR template — there is no `.github/pull_request_template.md` yet, so every session writes its description its own way; one template that leads with what changed for the user and what to check, then the details
- [ ] Milestone — Quality gate before Phase 2: settle the mutation layer and component structure before Phase 2 and Daily rhythm start, so their new pages are built the new way. One sub-bullet per open step of the planner project *Mars Workbench — Phase 2 前的代码质量*, in its order and numbered as there
  - [ ] Step 10 — Config-driven modals, the step's last part: every page but Plan is on the page structure now (AGENTS.md › Layers › *Page structure*); the modals settle the rest of how Phase 2's new pages (Habits, Plan week) are written
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
  - [ ] Step 14 — Code review agent: explored as Harness engineering › 3 (above), which settles its scope
- [ ] Spike: tracking production errors — today a crash leaves nothing to debug (2026-10-30: dragging a daily card to Done on the phone PWA ended on Next's "Application error" page; the write had saved, and no log or report showed why)
- [ ] Persist sidebar collapse state across page refreshes (localStorage with SSR hydration)
- [ ] Daily rhythm — Open / Close-the-day rituals and phone notifications for unfinished tasks; starts after the Quality gate milestone. Spike `design/spike/daily-rhythm-notifications.md` in PR #33 (awaiting review, written before Phase 1); when picked up, regroup its sheets by kind, map "Still on it" to staying in Todo (the board has no Doing column), and re-derive the midday nudge's triggers (it keys off the risk clock and In Progress cards, both gone)

### Medium

- [ ] First visit of a page still shows its skeleton for ~310 ms: once `loading.tsx` is up, React holds the content back 300 ms, while the data now arrives in ~30–85 ms locally (`design/spike/archived/mutation-layer.md`, Q4). Measure on production, then decide per page whether to drop the skeleton for a pending state on the link
- [ ] Measure `ci-fixer` on the next red GitHub CI: delegate the failing job to it and compare the main-session context with reading the log inline; if it still comes out even, drop the agent (`design/spike/archived/subagent-delegation-pilot.md` › Decision, Q2)
- [ ] `ui/` component-structure lookup in `reference.md` — a lean high-level map for agents (humans use the `/design` gallery); follow-up to the landed component library
- [ ] Uniform page header across board / priorities / projects / dump / settings on both breakpoints (plan keeps its planning-mode header until Phase 2's Plan hub header); also resolves the BoardHeader green-vs-primary accent drift and revisits the mobile header type scale (current mobile header font size reads too large). Along the way (`design/spike/archived/board-prop-drilling.md` Part 2): fold BoardHeader's extra wrapper div and redraw the stale `kanban/loading.tsx` skeleton
- [ ] Redesign the point system and metric tracking — how sizes map to points, and what the board's Today / Week / Daily avg metrics count now that a week mixes habits, project steps and one-offs (PR 3 only added a project bucket to the week projection). Direction proposed in `design/spike/week-model-phase2-pain-points.md` (points → hours of a weekly budget)

### Future

- [ ] Cron-driven sync — move the daily / end-of-period sync to a scheduled job (e.g. Vercel Cron hitting a route just after midnight in `KANBAN_TZ`); pages keep the idempotent `ensureSynced` as fallback. `runDailySync` / `runEndOfPeriodSync` are already standalone for this
- [ ] User-configurable timezone — Date utils are currently anchored to `America/Los_Angeles` via `KANBAN_TZ` constant. Consider making this a user setting stored in the database for multi-user support or if the user relocates (traveling users)
- [ ] Custom domain — move off `*.vercel.app`; update Supabase Site URL + Redirect URLs. The MCP connector URL (and its protected-resource `resource`) is tied to the domain, so a switch means re-adding the connector in Claude
- [ ] Spike: leverage the UI flows table for all user actions — every user action that changes server state, per page, as one table row (entry point → server action → optimistic or not → what follows: selection, navigation, rollback); reference: the Interactions table in `design/spike/archived/week-model-pr4-projects-ui.md`. Decide where the tables live and backfill board, priorities, plan and dump
- [ ] Spike: type organization — shared types live in `src/types/`, DAL row types in `lib/db/*`, plus `z.infer` aliases and service-local types; propose where each kind lives and how it's named so types stay findable as the app grows
