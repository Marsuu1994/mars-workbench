# Auth

Authentication layer for Mars Workbench. See [baseline.md](./design/baseline.md) for design docs.

## Current State

Auth infrastructure, login page, and app sidebar implemented. Supabase Auth connected with Google OAuth flow — Supabase client utilities (browser, server, middleware), OAuth callback route handler (`/auth/callback`), and route protection proxy (`proxy.ts`) redirect unauthenticated users to the login page. Login page (`/auth/login`) renders a branded sign-in screen with Google OAuth button, theme-aware decorations for both dark and light modes, and fade-in animations. Authenticated users visiting `/auth/login` are redirected to homepage. Collapsible app sidebar (`AppSidebar`) in the root layout provides navigation between features (Chat, Kanban) and sign-out. App deployed on Vercel.

## Backlog

### High Priority
- [ ] Add userId to existing features (kanban, chat)
- [ ] Persist sidebar collapse state across page refreshes (localStorage with SSR hydration)

### Future
- [ ] User profile/settings page


## Update Log

### 2026-03-08
- Implemented collapsible app sidebar with navigation (Chat, Kanban) and sign-out flow (mockup: `mockup/mockup-sidebar.html`)
- Root layout fetches user via Supabase server client and renders sidebar + main content in flex layout
- Sidebar features: collapse/expand with smooth transitions, logo hover interaction, opacity-based text fading, tooltips, cursor feedback
- Redirect authenticated users away from `/auth/login` to homepage
- Adjusted chat and kanban layouts for nesting (`h-screen` → `h-full`)
- Implemented login page (`/auth/login`) with Google OAuth sign-in button
- Added theme-aware decorative elements (grid, atmospheric gradients, button hover shadow) for dark/light modes
- App deployed on Vercel

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
- [x] Create feature scaffold and design doc templates
- [x] Design auth approach (provider selection, session strategy, schema)
- [x] Design login/signup UI flows and mockups
- [x] Connect to Supabase database and migrate data
- [x] Add auth infrastructure (Supabase clients, callback route, route protection proxy)
- [x] Implement login/signup pages
- [x] Redirect authenticated users away from `/auth/login` to homepage
- [x] Collapsible app sidebar with sign-out flow
- [x] Deploy app on Vercel
