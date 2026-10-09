# Tracker

Single source of truth for open ideas and todos across the app — open items only; completed work is recorded in the root `README.md` Update Log, not here.

## Board

### Medium

- [ ] Stack duplicate habit instances in the backlog — the kind-first card has landed; PR #44 implements stacking on the old card and needs moving onto the new face (project steps and one-offs never stack)

### Future

- [ ] Support same group ordering for drag and drop within same column
- [ ] Per-kind risk rules — Phase 1 switched risk off (badges, borders, 15:00 / 20:00 clock thresholds); bring it back per kind, as a colour on the card's signal line (never the kind edge): habit pace (amber when what's left needs every remaining day), project step carried 2× (amber — split it?), one-off due date (amber within 2 days, red on the day — the only red). First explored in PR #47's initial mockup (commit `d3ecc25`, Cards & risk screen)

## Plan

### Medium

- [ ] Week model Phase 1 — Projects MVP: projects (a goal + ordered steps that never expire) under a Plan hub, kind-first cards with risk off, a Todo · Done board, and MCP project tools. Spike `design/spike/week-model-restructure.md` (approved); flows `design/flows/projects.md` + the *Phase 1 pending* notes in `baseline.md` and `flows/`; mockups `design/mockup/future-work/mockup-week-model-phase1-v2.html` + `mockup-projects-v2.html`
  - [ ] PR 3 — project data layer: additive migrations, DAL / service / actions, the step lifecycle (can run alongside PR 2)
  - [ ] PR 4 — Projects UI: Plan hub, Projects page and its modals, All steps done, steps on the board and in the plan form, scenario pages (then the two Phase 1 mockups go)
  - [ ] PR 5 — MCP for projects: projects in the context, `create_project` / `update_project`, steps in `create_plan` / `update_plan`, and the prompt for finished projects and archiving (finalized in this PR)
- [ ] ReviewChangesModal / OverlayShell body height needs tuning on **both** breakpoints — with long change lists the box grows so tall the header ends up out of view; revisit the max-height caps (mobile `max-h-[85vh]`, desktop `md:max-h-[calc(100vh-5em)]`) so the pinned header/footer always stay on screen

### Future

- [ ] Week model Phase 2 (not planned yet) — habits own their cadence (Daily = every day, or N× per week; Plan Mode dropped) with a Plan › Habits page; a three-step Plan week replaces the plan form; the in-app AI chat is removed (AI planning goes through Claude + MCP); Done becomes the week's day-grouped log and cards get a ✓; missed habit days expire quietly (no rollover); cleanup of `DOING` and `Plan.mode`. Exploration `design/mockup/future-work/mockup-week-model-phase2-v2.html`
- [ ] Habit-level days — let each habit run on weekdays, every day or custom days (after Phase 2 drops Plan Mode, Daily means every day)
- [ ] Explore entry points for habits and projects — whether they get their own sidebar item / dock tab instead of living under the Plan hub (Phase 1 adds no new nav items)

## Priorities

### Medium

- [ ] Design risk level for ad-hoc task on priority matrix
- [ ] Ad-hoc task deletion and auto-clear logic

### Future

- [ ] Optional due date on one-off tasks — set when adding or editing a priority task, shown on matrix and board cards; the one source of red once per-kind risk rules return (see Board › Future)
- [ ] Move-to popover on a card near the bottom of the viewport is cut off — the panel now escapes its quadrant's scroll clip (fixed at its static position, no portal) but cannot flip upward; revisit with CSS anchor positioning (`position-try-fallbacks: flip-block`)

## Dump

### Future

- [ ] LLM batch processing of dumped entries — what it does is TBD (classify / summarize / extract tasks); walks `isProcessed = false` entries and marks them handled
- [ ] Entry edit + delete (V1 is append-only)
- [ ] Full-text search across entries
- [ ] PWA "New entry" shortcut / share-target for one-tap capture from the home screen

## Auth

### High

- [ ] Persist sidebar collapse state across page refreshes (localStorage with SSR hydration)

### Future

- [ ] Connected apps in Settings — list and revoke the user's OAuth grants (Supabase `listGrants` / `revokeGrant`); today a grant can only be revoked from the Supabase dashboard, so the consent page doesn't promise revocation
- [ ] User profile/settings page
- [ ] Postgres Row-Level Security (RLS) policies (`using (user_id = auth.uid())`) as DB-level defense-in-depth beneath the app-layer userId scoping. Needs Prisma↔Supabase JWT plumbing (per-request `SET` of claims, or a JWT-aware connection role)

## Cross-cutting

### High

- [ ] Daily rhythm — Open / Close-the-day rituals and phone notifications for unfinished tasks; kept out of the restructure's scope. Spike `design/spike/daily-rhythm-notifications.md` on branch `claude/notification-task-tracking-design-gcxwy0` (awaiting review); when picked up, regroup its sheets by kind and map "Still on it" to staying in Todo (the board has no Doing column)

#### Design error states

Error presentation is unstyled or ad-hoc across the app (the AI chat's red alert strip prompted this); design one error language (tone, copy, placement, visual treatment) and apply it per flow:

- [ ] Plan form — create/update submit failures (`FormErrorAlert` banner above the actions)
- [ ] Task modal — template create/edit and priority-task add failures (footer `FormErrorAlert`)
- [ ] Board — drag/status-update failures (currently silent optimistic rollback + `console.error`)
- [ ] Priorities — reprioritize/track failures (currently silent optimistic rollback + `console.error`)
- [ ] Auth — OAuth sign-in failure surface (none today; login just returns to the button)

### Medium

- [ ] `ui/` component-structure lookup in `reference.md` — a lean high-level map for agents (humans use the `/design` gallery); follow-up to the landed component library
- [ ] Uniform page header across board/priorities/settings on both breakpoints (plan keeps its planning-mode header); also resolves the BoardHeader green-vs-primary accent drift and revisits the mobile header type scale (current mobile header font size reads too large)

### Future

- [ ] Cron-driven sync — move the daily / end-of-period sync to a scheduled job (e.g. Vercel Cron hitting a route just after midnight in `KANBAN_TZ`); pages keep the idempotent `ensureSynced` as fallback. `runDailySync` / `runEndOfPeriodSync` are already standalone for this
- [ ] User-configurable timezone — Date utils are currently anchored to `America/Los_Angeles` via `KANBAN_TZ` constant. Consider making this a user setting stored in the database for multi-user support or if the user relocates (traveling users)
- [ ] LLM-generated motivational messages
- [ ] Evaluate Storybook vs. the in-app `/design` gallery + scenarios as the long-term UI workbench — spike written with pros/cons + phased migration plan: `design/spike/design-console-vs-storybook.md` (awaiting review)
- [ ] Custom domain — move off `*.vercel.app`; update Supabase Site URL + Redirect URLs. The MCP connector URL (and its protected-resource `resource`) is tied to the domain, so a switch means re-adding the connector in Claude
- [ ] Separate dev environment, including the DB — local dev currently shares the production Supabase project (data, Auth config, single Site URL); set up a dev Supabase project or branch + env vars so local work and write-tool testing never touch prod data
- [ ] Spike: shared server-action handler — most actions repeat parse → `getCurrentUserId` → service → `revalidatePath` → map errors to `Errors.*`; explore a config-driven wrapper (schema, revalidate paths, error map). Pairs with the error-handling spike
- [ ] Spike: error-handling conventions — services mix returned `{error}` form shapes with thrown errors (`TemplateNotFoundError`, plain `Error`); find one pattern (typed domain errors + one mapping per surface: forms, AI chat, MCP) and the common logic to extract
- [ ] Spike: type organization — shared types live in `src/types/`, DAL row types in `lib/db/*`, plus `z.infer` aliases and service-local types; propose where each kind lives and how it's named so types stay findable as the app grows
