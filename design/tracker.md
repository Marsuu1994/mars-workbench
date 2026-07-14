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
- [ ] Mobile adaptation for the AI plan chat modal — it stays a 640px-capped centered card on phones while sibling modals (TaskModal, ReviewChangesModal) switch to `modal-bottom` sheets; no mobile AI-chat mockup exists (design the mobile presentation first, then implement)
- [ ] Redesign the template edit (pencil) affordance for discoverability — currently `opacity-0 group-hover:opacity-100` on TemplateItem, so it's invisible on touch and hidden-until-hover on desktop; both plan-form mockups draw it always visible. Needs a design exploration (`/design-explore`) before implementation

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

- [ ] `ui/` component-structure lookup in `reference.md` — a lean high-level map for agents (humans use the `/design` gallery); follow-up to the landed component library
- [ ] Scenario pages for priorities and plan — extend the board pilot (`/design/scenarios`: real page components + fixture data as screen-level source of truth): `scenarios/priorities` (full matrix + tracked + popover), `scenarios/plan` (form, review-modal change types, AI chat mid-flow)
- [ ] Gallery tabbed navigation — split `/design`'s single long scroll into tabs mirroring the component layers (`ui/` · `application/` · `domain/`)
- [ ] Scenario tabbed navigation — tab-switch between flows/states inside `/design/scenarios` (like the old mockup navigator) instead of separate routes
- [ ] Per-feature mockup retirement — retire `design/mockup/<feature>/` only once that feature has a scenario (one screen-level source of truth each; `future-work/` and `flows/*.md` stay). Board qualifies but is held to retire as a set; on each retirement update AGENTS.md UI Workflow + the `/design-explore` and `/new-flow` skills
- [ ] Back-port the HUD FX layer (see `design/design-system.md`) into mockup CSS — **on hold**: superseded per-feature as scenarios retire mockups; the palette swap already landed in `mockup-theme.css`
- [ ] Uniform page header across board/priorities/settings on both breakpoints (plan keeps its planning-mode header); also resolves the BoardHeader green-vs-primary accent drift

### Future

- [ ] Cron-driven sync — move the daily / end-of-period sync to a scheduled job (e.g. Vercel Cron hitting a route just after midnight in `KANBAN_TZ`); pages keep the idempotent `ensureSynced` as fallback. `runDailySync` / `runEndOfPeriodSync` are already standalone for this
- [ ] User-configurable timezone — Date utils are currently anchored to `America/Los_Angeles` via `KANBAN_TZ` constant. Consider making this a user setting stored in the database for multi-user support or if the user relocates (traveling users)
- [ ] Phone notifications for unfinished tasks
- [ ] LLM-generated motivational messages
- [ ] Setup storybook and optimize workflow for UI mockup
