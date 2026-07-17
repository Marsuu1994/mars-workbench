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

## Settings Overlay Flow

> **Status: approved exploration, implementation pending** — see
> `design/mockup/future-work/temp-settings-v2.html`. Until it lands, today's
> behavior is: mobile dock routes to a `/kanban/settings` page; desktop has no
> settings entry (sign-out is a bare icon in the sidebar user row).

**Trigger:** Mobile — tapping the dock's Settings tab (4th slot becomes a trigger, not a route). Desktop — clicking the sidebar user row (whole row, chevron affordance; the bare sign-out icon is removed).

**Steps:**

1. The shared `SettingsSheet` opens via `OverlayShell` `responsive` (mobile `modal-bottom` sheet / desktop centered modal). The page stays mounted underneath; the dock tab shows a pressed tint only while open — no persistent active state (action, not location).
2. Panel content, identical on both breakpoints: identity card (avatar/name/email) → theme picker → sign-out row → app version.
3. Dismiss via backdrop, close chevron, or Esc.

`/kanban/settings` is deleted with this change — settings stops being a page on any breakpoint (decision rule: it stays an overlay until it outgrows one screen, then becomes a page on **both** breakpoints).

## Theme Change Flow

> **Status: approved exploration, implementation pending** (same exploration as above).

**Trigger:** User selects a theme card in the Settings overlay — Sora light (`mars-light`) / Sora dark (`mars-dark`) / P5 dark (`p5-dark`, per the Calling Card proposal)

**Steps:**

1. Client stamps `data-theme` on `<html>` immediately (optimistic, no reload)
2. `updateThemeAction` persists the choice in an SSR-readable cookie; `layout.tsx` reads it so the next server render ships the right theme (no flash)
3. The selected card shows its check ring; re-selecting is a no-op

Rules: default with no cookie is `mars-dark` (first-time users); theme is an explicit user choice — no time- or system-preference auto-switching. Internal theme names are stable (`mars-*`, `p5-dark`); display labels live in i18n.

## Sign-Out Flow

**Trigger:** User taps the sign-out row in the Settings overlay *(pending — today: the mobile settings page button / desktop sidebar icon)*

**Steps:**

1. First tap arms an inline confirm — the row swaps to "Sign out?" with Cancel / Sign out actions; Cancel (or dismissing the overlay) disarms
2. Confirming calls `supabase.auth.signOut()` to end the session
3. Redirect to `/auth/login`
