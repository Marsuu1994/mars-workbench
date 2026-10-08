# Tracker

Single source of truth for open ideas and todos across the app — open items only; completed work is recorded in the root `README.md` Update Log, not here.

## Board

### Medium

- [ ] Stack duplicate habit instances in the backlog — parked until the restructure's kind-first card lands; PR #44 implements it on today's card and only needs moving onto the new face (project steps and one-offs never stack)

### Future

- [ ] Support same group ordering for drag and drop within same column
- [ ] Per-kind risk rules — the restructure switches today's risk off (badges, borders, 15:00 / 20:00 clock thresholds); bring it back per kind: habit pace (amber when what's left needs every remaining day), project step carried 2× (amber — split it?), one-off due date (amber within 2 days, red on the day — the only red). Designed in the restructure mockup's Cards & risk screen

## Plan

### Medium

- [ ] Restructure the week into habits / projects / one-offs — Doing column removed, Todo renamed, kind-first cards, Projects + Habits pages, three-step Plan week; 8-PR plan with schema options in `design/spike/week-model-restructure.md` (awaiting review), mockup `design/mockup/future-work/temp-week-model-v2.html`
- [ ] ReviewChangesModal / OverlayShell body height needs tuning on **both** breakpoints — with long change lists the box grows so tall the header ends up out of view; revisit the max-height caps (mobile `max-h-[85vh]`, desktop `md:max-h-[calc(100vh-5em)]`) so the pinned header/footer always stay on screen

### Future

## Priorities

### Medium

- [ ] Design risk level for ad-hoc task on priority matrix
- [ ] Ad-hoc task deletion and auto-clear logic

### Future

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

### Design error states

Error presentation is unstyled or ad-hoc across the app (the AI chat's red alert strip prompted this); design one error language (tone, copy, placement, visual treatment) and apply it per flow:

- [ ] AI plan chat — initialization/generation failures (currently a bare red alert strip above the input)
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
- [ ] Daily rhythm — Open / Close-the-day rituals and phone notifications for unfinished tasks; kept out of the restructure's scope. Spike `design/spike/daily-rhythm-notifications.md` on branch `claude/notification-task-tracking-design-gcxwy0` (awaiting review); when picked up, regroup its sheets by kind and map "Still on it" to staying in Today (no Doing column)
- [ ] LLM-generated motivational messages
- [ ] Evaluate Storybook vs. the in-app `/design` gallery + scenarios as the long-term UI workbench — spike written with pros/cons + phased migration plan: `design/spike/design-console-vs-storybook.md` (awaiting review)
- [ ] Custom domain — move off `*.vercel.app`; update Supabase Site URL + Redirect URLs. The MCP connector URL (and its protected-resource `resource`) is tied to the domain, so a switch means re-adding the connector in Claude
- [ ] Separate dev environment, including the DB — local dev currently shares the production Supabase project (data, Auth config, single Site URL); set up a dev Supabase project or branch + env vars so local work and write-tool testing never touch prod data
- [ ] Spike: shared server-action handler — most actions repeat parse → `getCurrentUserId` → service → `revalidatePath` → map errors to `Errors.*`; explore a config-driven wrapper (schema, revalidate paths, error map). Pairs with the error-handling spike
- [ ] Spike: error-handling conventions — services mix returned `{error}` form shapes with thrown errors (`TemplateNotFoundError`, plain `Error`); find one pattern (typed domain errors + one mapping per surface: forms, AI chat, MCP) and the common logic to extract
- [ ] Spike: type organization — shared types live in `src/types/`, DAL row types in `lib/db/*`, plus `z.infer` aliases and service-local types; propose where each kind lives and how it's named so types stay findable as the app grows
