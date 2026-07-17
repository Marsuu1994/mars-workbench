# Auth Flows

Flows for authentication (`/auth/*`) — route protection, Google OAuth sign-in/up, and sign-out. Sibling docs: `design/flows/board.md`, `design/flows/plan.md`, `design/flows/priorities.md`, `design/flows/shared.md`.

## Route Protection Flow

**Trigger:** User navigates to any protected route without a valid session

**Mechanism:** The Next.js proxy (`src/proxy.ts`, delegating to `updateSession` in `src/lib/supabase/middleware.ts`) checks the session. If no valid session exists, redirect to `/auth/login`.

## Login Flow

**Trigger:** User navigates to `/auth/login`

**Steps:**

1. User clicks "Sign in with Google"
2. Browser redirects to Google OAuth consent screen; user completes authentication
3. Google redirects to the Supabase callback URI for token exchange
4. Supabase redirects to `/auth/callback` with an authorization code
5. The app exchanges the code for a session via `supabase.auth.exchangeCodeForSession()`
6. User is redirected to the homepage

## Sign-Up Flow

Same as login — Supabase auto-creates a user record on first Google sign-in.

## Theme Change Flow

> **Status: approved exploration, implementation pending.** The Settings overlay
> itself (entry points, sheet/modal presentation, panel layout) is UI, not a flow —
> it's documented by `design/mockup/future-work/temp-settings-v2.html` (the auth
> scenario takes over once implemented). Flows below cover only its side-effecting
> actions. Landing this deletes the `/kanban/settings` route — settings becomes
> overlay-only on both breakpoints.

**Trigger:** User selects a theme card in the Settings overlay — Sora light (`mars-light`) / Sora dark (`mars-dark`) / P5 dark (`p5-dark`, per the Calling Card proposal)

**Steps:**

1. Client stamps `data-theme` on `<html>` immediately (optimistic, no reload)
2. `updateThemeAction` persists the choice in an SSR-readable cookie; `layout.tsx` reads it so the next server render ships the right theme (no flash)
3. The selected card shows its check ring; re-selecting is a no-op

Rules: default with no cookie is `mars-dark` (first-time users); theme is an explicit user choice — no time- or system-preference auto-switching. Internal theme names are stable (`mars-*`, `p5-dark`); display labels live in i18n.

## Sign-Out Flow

**Trigger:** User confirms the two-step sign-out row in the Settings overlay — the arm/confirm interaction itself is UI, see the exploration mockup *(pending — today: the mobile settings page button / desktop sidebar icon, single tap)*

**Steps:**

1. Call `supabase.auth.signOut()` to end the session
2. Redirect to `/auth/login`
