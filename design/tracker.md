# Tracker

Single source of truth for open ideas and todos across the app — open items only; completed work is recorded in the root `README.md` Update Log, not here.

## Board

### Medium

- [ ] Evidence submit flow — when the user moves a task to done, submit evidence

### Future

- [ ] Support same group ordering for drag and drop within same column
- [ ] Weekly task rollover across periods

## Plan

### Medium

- [ ] Add AI-generated task instance flow — LLM should be able to generate task instances based on past work + task template information; need to record the quality of tasks it generated

### Future

- [ ] Template categories — Add optional `category` field to TaskTemplate for grouping templates in the plan form. Collapsible groups + search for scalability. Mockups in `design/mockup/future-work/`
- [ ] Expand the AI plan creation flow
  - Per-card select/unselect to keep/remove individual draft templates during AI plan creation
  - Inline editing of size, type, frequency on draft template cards before approval (without re-prompting)
  - Ad-hoc task carryover in AI plan creation flow
  - LLM-suggested plan mode (NORMAL/EXTREME)
- [ ] AI-assisted plan editing — Use a new Chat linked to the same plan to suggest modifications via LLM. Separate from creation flow
- [ ] Add subtitle field to task template
- [ ] Biweekly and custom period types

## Priorities

### Medium

- [ ] Design risk level for ad-hoc task on priority matrix
- [ ] Ad-hoc task deletion and auto-clear logic

### Future

- [ ] Track popover on a bottom card of a scrollable quadrant needs scrolling into view (absolute positioning inside the scroll container) — revisit with a portal/fixed positioning approach

## Auth

### High

- [ ] Add signout prompt modal
- [ ] Persist sidebar collapse state across page refreshes (localStorage with SSR hydration)

### Future

- [ ] User profile/settings page
- [ ] Postgres Row-Level Security (RLS) policies (`using (user_id = auth.uid())`) as DB-level defense-in-depth beneath the app-layer userId scoping. Needs Prisma↔Supabase JWT plumbing (per-request `SET` of claims, or a JWT-aware connection role)

## Cross-cutting

### Medium

- [ ] Refine the component gallery page (`/design`) — add remaining primitives (BoardColumn, TemplateItem, task-modal pieces), polish grouping/layout, and consider per-variant controls
- [ ] Back-port the Mission Control HUD FX language (mono `fx-label`/`fx-num` telemetry type, LED dots, corner brackets, glow states) into the mockup component classes in `design/mockup/styles.css` and per-mockup CSS — the palette swap landed in `mockup-theme.css`, but mockups don't yet render the FX layer (see `design/design-system.md`)

### Future

- [ ] Cron-driven sync — move the daily / end-of-period sync to a scheduled job (e.g. Vercel Cron hitting a route just after midnight in `KANBAN_TZ`); pages keep the idempotent `ensureSynced` as fallback. `runDailySync` / `runEndOfPeriodSync` are already standalone for this
- [ ] User-configurable timezone — Date utils are currently anchored to `America/Los_Angeles` via `KANBAN_TZ` constant. Consider making this a user setting stored in the database for multi-user support or if the user relocates (traveling users)
- [ ] Phone notifications for unfinished tasks
- [ ] LLM-generated motivational messages
- [ ] Setup storybook and optimize workflow for UI mockup
