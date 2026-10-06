# Auth Flows

Flows for authentication (`/auth/*`, `/oauth/consent`) — route protection, Google OAuth sign-in/up, MCP connector consent, and sign-out. Sibling docs: `design/flows/board.md`, `design/flows/plan.md`, `design/flows/priorities.md`, `design/flows/shared.md`.

## Route Protection Flow

**Trigger:** User navigates to any protected route without a valid session

**Mechanism:** The Next.js proxy (`src/proxy.ts`, delegating to `updateSession` in `src/lib/supabase/middleware.ts`) checks the session. If no valid session exists, redirect to `/auth/login?next=<requested path + query>` (no `next` for `/`), so sign-in returns the visitor to the page that asked for it.

## Login Flow

**Trigger:** User navigates to `/auth/login`

**Steps:**

1. User clicks "Sign in with Google"
2. Browser redirects to Google OAuth consent screen; user completes authentication
3. Google redirects to the Supabase callback URI for token exchange
4. Supabase redirects to `/auth/callback` (carrying `next`) with an authorization code
5. The app exchanges the code for a session via `supabase.auth.exchangeCodeForSession()`
6. User is redirected to `next`, or the homepage without one; a failed exchange returns to the login page, still carrying `next`

Rules: `next` is honored only as a same-origin path (`getSafeNextPath` resolves it and rejects anything another origin could hide behind — `//host`, `/\host`, control characters); otherwise it falls back to `/`. An already signed-in visitor on `/auth/login` is forwarded to `next` the same way.

## Sign-Up Flow

Same as login — Supabase auto-creates a user record on first Google sign-in.

## OAuth Consent Flow

**Trigger:** An MCP client (Claude) starts Supabase's OAuth 2.1 authorization flow; Supabase redirects to the app's authorization path, `/oauth/consent?authorization_id=…` (Site URL + the path set under Authentication → OAuth Server)

**Steps:**

1. Signed out → Route Protection sends the user through login and back here (`next`)
2. The page loads the request (`getAuthorizationDetails`):
   - consent needed → the consent screen: client, approving account (+ Switch account), what access it grants, the host the browser returns to, Deny / Allow
   - already consented → redirect straight back to the client (no UI)
   - missing, malformed, unknown, expired or already decided → the invalid-link state
3. Allow / Deny → `approveAuthorization` / `denyAuthorization` → redirect to the returned `redirect_url` (the code, or `error=access_denied`). A request that can no longer be decided re-renders the page into the invalid-link state
4. Switch account → sign out on this device only → `/auth/login?next=` this request

Rules: the page is chromeless and never renders inside a frame (`frame-ancestors 'none'` + `X-Frame-Options: DENY` on `/oauth/*`, against clickjacking the Allow button). The access list is fixed copy — a token reaches every MCP tool whatever the scopes; the raw scopes are shown muted. The return host comes from the client's redirect URI (client names are self-asserted under dynamic registration). `authorization_id` must match Supabase's alphanumeric format before any call — the SDK puts it in its API path unescaped. Requires the OAuth Server enabled in the Supabase dashboard with this authorization path.

## Theme Change Flow

> The Settings overlay itself (entry points, sheet/modal presentation, panel
> layout) is UI, not a flow — see the auth scenario (`/design/scenarios/auth`).
> Flows below cover only its side-effecting actions. `/kanban/settings` no longer
> exists — settings is overlay-only on both breakpoints.

**Trigger:** User selects a theme card in the Settings overlay — Sora light (`mars-light`) / Sora dark (`mars-dark`) / P5 dark (`p5-dark`, per the Calling Card proposal)

**Steps:**

1. Client stamps `data-theme` on `<html>` immediately (optimistic, no reload)
2. `updateThemeAction` persists the choice in an SSR-readable cookie; `layout.tsx` reads it so the next server render ships the right theme (no flash)
3. The selected card shows its check ring; re-selecting is a no-op

Rules: default with no cookie is `mars-dark` (first-time users); theme is an explicit user choice — no time- or system-preference auto-switching. Internal theme names are stable (`mars-*`, `p5-dark`); display labels live in i18n. `<html>` is the only theme scope on a page: the Design Console previews by re-stamping it and restores the cookie theme on exit, never writing the cookie.

## Sign-Out Flow

**Trigger:** User confirms the two-step sign-out row in the Settings overlay (the arm/confirm interaction itself is UI — see the auth scenario)

**Steps:**

1. Call `supabase.auth.signOut()` to end the session
2. Redirect to `/auth/login`
