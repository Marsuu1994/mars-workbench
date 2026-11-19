# Auth & Settings Flows

Flows for authentication (`/auth/*`, `/oauth/consent`, `/api/mcp` tokens) — route protection, Google OAuth sign-in/up, MCP connector consent and token checks — and the Settings overlay's two actions, theme change and sign-out. The overlay itself (entry points, sheet/modal presentation, panel layout) is UI: the auth scenario (`/design/scenarios/auth`); it is overlay-only on both breakpoints.

---

## Route Protection Flow

### Trigger / Entry Point

User navigates to any protected route without a valid session.

### Steps

The Next.js proxy (`src/proxy.ts`, delegating to `updateSession` in `src/lib/supabase/middleware.ts`) checks the session. If no valid session exists, redirect to `/auth/login?next=<requested path + query>` (no `next` for `/`), so sign-in returns the visitor to the page that asked for it. A valid session passes, refreshed when it is about to expire.

### Rules

- Every route is protected except `/auth/*` (login and the callback), `/api/mcp` and `/.well-known/` (the MCP endpoint answers 401 itself), and the public files: images, `sw.js` and `manifest.json` (a service worker script may not arrive through a redirect, and the login page needs a real manifest to stay installable).
- Local dev (`npm run dev`) also serves the Design Console (`/design` and below) without a session, since it renders fixtures only; production builds, previews included, keep the gate on it too.

---

## Login Flow

### Trigger / Entry Point

User navigates to `/auth/login`, usually sent there by Route Protection.

### Steps

1. User clicks "Sign in with Google"; the login page hands `next` to the callback in a short-lived cookie scoped to `/auth/callback`
2. Browser redirects to Google OAuth consent screen; user completes authentication
3. Google redirects to the Supabase callback URI for token exchange
4. Supabase redirects to `/auth/callback` with an authorization code
5. The app exchanges the code for a session via `supabase.auth.exchangeCodeForSession()`
6. User is redirected to `next`, or `/` without one, which goes on to the board (`/kanban`); a failed exchange returns to the login page, still carrying `next`

### Rules

`redirectTo` stays the bare `/auth/callback` — Supabase matches it against the Redirect URLs allow-list query included, so a `next` query would fall back to the Site URL. The callback clears the cookie, and a plain sign-in expires any stale one. `next` is honored only as a same-origin path (`getSafeNextPath` resolves it and rejects anything another origin could hide behind — `//host`, `/\host`, control characters); otherwise it falls back to `/`. An already signed-in visitor on `/auth/login` is forwarded to `next` the same way.

---

## Sign-Up Flow

### Trigger / Entry Point

A first Google sign-in.

### Steps

Same as login — Supabase auto-creates a user record on first Google sign-in. The app keeps no user table of its own, so the new user lands on the empty board, asked to create their first plan.

---

## OAuth Consent Flow

### Trigger / Entry Point

An MCP client (Claude) starts Supabase's OAuth 2.1 authorization flow; Supabase redirects to the app's authorization path, `/oauth/consent?authorization_id=…` (Site URL + the path set under Authentication → OAuth Server)

Two OAuth flows meet here: Supabase is the **authorization server** for Claude (it issues the authorization id, the code and the token), while signing in to the app itself is the separate Google flow above. The app hosts the consent screen for Supabase and, as `/api/mcp`, is the resource server that checks the token.

```mermaid
sequenceDiagram
    autonumber
    actor U as You (browser)
    participant C as Claude (MCP client)
    participant S as Supabase Auth
    participant A as Mars Workbench /oauth/consent
    participant M as Mars Workbench /api/mcp

    Note over C,M: First connect: discovery and client registration
    C->>M: call without a token
    M-->>C: 401, WWW-Authenticate points at /.well-known/oauth-protected-resource/api/mcp
    C->>M: read protected-resource metadata
    M-->>C: resource = /api/mcp, authorization server = Supabase Auth
    C->>S: read auth-server metadata, register (DCR)
    S-->>C: client_id

    C->>C: create PKCE verifier (kept) + challenge (sent)
    C->>U: open /auth/v1/oauth/authorize (client_id, redirect_uri, challenge, state)
    U->>S: GET authorize
    S->>S: check client + redirect_uri, create authorization_id (10 min)
    S-->>U: redirect to Site URL /oauth/consent?authorization_id
    U->>A: open consent page
    opt signed out
        A-->>U: login with next, Google sign-in, back to the consent page
    end
    A->>S: getAuthorizationDetails(id) with your session
    S->>S: bind the request to you (another account now gets not-found)
    alt already consented
        S-->>A: redirect_url with a code
        A-->>U: redirect straight to the client callback
    else consent needed
        S-->>A: client, scopes, redirect_uri, your email
        A-->>U: consent screen
        U->>A: Allow or Deny
        A->>S: approveAuthorization or denyAuthorization
        S-->>A: redirect_url (code and state, or error=access_denied)
        A-->>U: redirect to the client callback
    end
    U->>C: callback with code and state
    C->>S: POST /auth/v1/oauth/token (code + verifier)
    S-->>C: access token (JWT: sub = you, client_id = Claude) + refresh token

    Note over C,M: Every tool call
    C->>M: tool call with Authorization Bearer token
    M->>M: verify JWT (project JWKS, expiry, issuer, client_id), userId = sub
    M-->>C: tool result (invalid or expired token: 401)
    C->>S: refresh the token when it expires (the app is not involved)
```

### Steps

The consent page:

1. Signed out → Route Protection sends the user through login and back here (`next`)
2. The page loads the request (`getAuthorizationDetails`):
   - consent needed → the consent screen: client, approving account, what access it grants, the host the browser returns to, Deny / Allow
   - already consented → redirect straight back to the client (no UI)
   - missing, malformed, unknown, expired or already decided → the invalid-link state
3. Allow / Deny → `approveAuthorization` / `denyAuthorization` → redirect to the returned `redirect_url` (the code, or `error=access_denied`). A request that can no longer be decided re-renders the page into the invalid-link state

### Rules

Supabase binds a request to the first account that opens it (another account gets not-found) and expires it after 10 minutes, so there is no in-page account switch — the wrong account starts over from the client. The page is chromeless and never renders inside a frame (`frame-ancestors 'none'` + `X-Frame-Options: DENY` on `/oauth/*`, against clickjacking the Allow button). The access list is fixed copy — a token reaches every MCP tool whatever the scopes; the raw scopes are shown muted. The return host comes from the client's redirect URI (client names are self-asserted under dynamic registration). `authorization_id` must match Supabase's alphanumeric format before any call — the SDK puts it in its API path unescaped. Requires the OAuth Server enabled in the Supabase dashboard with this authorization path, plus dynamic client registration (Claude registers itself).

**Token rules (`/api/mcp`):** every request needs a Supabase access token signed with the project's key (checked against its JWKS, cached, no Auth round trip), unexpired, issued by `<project>/auth/v1`, and carrying `client_id`, which only OAuth-server tokens have, so the browser session's own token is refused. Supabase doesn't bind tokens to a resource (`aud` is always `authenticated`), so any OAuth client the user approved in this project can call the endpoint; scopes aren't checked. Revoking a grant stops refreshes, but an access token already issued stays valid until it expires (the JWT expiry, 1 h by default). Missing or invalid → 401 with the metadata pointer, which also sends the client to refresh or re-authorize. Local development without a token acts as `MCP_DEV_USER_ID` — the seeded dev user of the local Supabase stack (`.env.example`); every other deployment, previews included and a production build with no `VERCEL_ENV`, requires a token.

---

## Theme Change Flow

### Trigger / Entry Point

User selects a theme card in the Settings overlay — Sora light (`mars-light`) / Sora dark (`mars-dark`) / P5 dark (`p5-dark`, per the Calling Card proposal)

### Steps

1. Client stamps `data-theme` on `<html>` immediately (optimistic, no reload)
2. `updateThemeAction` persists the choice in an SSR-readable cookie (a year); `layout.tsx` reads it so the next server render ships the right theme (no flash). The write isn't awaited: if it fails, the page keeps the new theme until the next load brings back the saved one
3. The selected card shows its check ring; re-selecting is a no-op

### Rules

Default with no cookie, or with a value that isn't a theme, is `mars-dark` (first-time users); theme is an explicit user choice — no time- or system-preference auto-switching. Internal theme names are stable (`mars-*`, `p5-dark`); display labels live in i18n. `<html>` is the only theme scope on a page: the Design Console previews by re-stamping it and restores the cookie theme on exit, never writing the cookie.

---

## Sign-Out Flow

### Trigger / Entry Point

User confirms the two-step sign-out row in the Settings overlay (the arm/confirm interaction itself is UI — see the auth scenario)

### Steps

1. Call `supabase.auth.signOut()` to end the session
2. Close the Settings overlay and go to `/auth/login` (no `next`)
