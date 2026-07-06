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

## Sign-Out Flow

**Trigger:** User clicks the logout button

**Steps:**

1. Call `supabase.auth.signOut()` to end the session
2. Redirect to `/auth/login`

## Settings Entry Points

Known chrome asymmetry, accepted for now:

- Mobile: the bottom dock has a Settings tab → `/kanban/settings` (profile card, sign-out button, app version).
- Desktop: the sidebar has no Settings link — profile info and sign-out live inline in the sidebar user section, so `/kanban/settings` is reachable only on mobile (or by direct URL). Revisit when the tracker's "User profile/settings page" item lands.
