# Auth

Authentication layer for Mars Workbench. See [baseline.md](../../../design/baseline.md) for design docs.

## Current State

Supabase Auth with Google OAuth, route protection, themed login page, and collapsible app sidebar with workspace navigation (Board/Plan) and sign-out. All mockups support light/dark theme toggle via shared `mockup-theme.css`. Deployed on Vercel.

Open items: see [design/tracker.md](../../../design/tracker.md).

## Update Log

### 2026-06-22
- Enabled real per-user data isolation for kanban. Added `getCurrentUserId()` helper (`src/lib/auth/getCurrentUserId.ts`) and threaded `userId` through the kanban DAL/services/actions/pages; reads filter by `userId`, creates stamp it, and id-based writes enforce ownership via `updateMany`/`updateManyAndReturn` on `{ id, userId }`
- Added `user_id` to `tasks` (migration `20260622060000`), backfilled all existing rows under the single user, cleared the deprecated `chats`/`messages` tables, then enforced `user_id NOT NULL` on `plans`/`task_templates`/`tasks` (migration `20260622070000`)
- Closed the orphaned ad-hoc task gap: `getNonDoneAdhocTasks` is now user-scoped, so unlinked (`plan_id = null`) tasks stay isolated per user

### 2026-06-03
- Redesigned sidebar from feature-level nav (Chat/Kanban) to workspace nav (Board/Plan) with disabled state and nudge badge

### 2026-03-09
- Added light/dark theme toggle to login and sidebar mockups via shared `mockup-theme.css`
- Converted all hardcoded colors in sidebar mockup to theme variables

### 2026-03-08
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

### 2026-02-25
- Scaffolded auth feature: folder structure, design doc templates, README

## Done
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
