# Spike: One error language — generic error handling across the app

**Status: awaiting owner review** · 2026-07-19

## Trigger

The tracker's cross-cutting **Design error states** item: error presentation is unstyled or ad-hoc across the app (the AI chat's bare red alert strip prompted it), and several failure paths show the user nothing at all. This spike surveys every data-touching flow (view and create/update), names the current patterns, and proposes one app-wide error language: **three surface patterns + one plumbing convention**, with strictly generic user-facing copy — the user never sees stack traces, zod internals, Prisma codes, or any hint of *why* something failed.

Mockups (one per surface pattern, all error states pinned):

- `design/mockup/future-work/mockup-error-toast-v2.html` — board/matrix op failures
- `design/mockup/future-work/mockup-error-overlay-v2.html` — overlay/form failures
- `design/mockup/future-work/mockup-error-screen-v2.html` — page-load failures

## Current state

### Server (actions/services/DAL)

- **Validation**: every input-taking action does `safeParse` → returns the **raw zod `flatten()`** to the client — default zod copy ("Invalid uuid") can reach the UI. Positional id params (`taskId`, `planId`, …) are never validated; malformed ids throw from Prisma.
- **Domain errors**: the `{error: {formErrors: [t('Errors.key')], fieldErrors: {}}}` envelope is re-declared ad hoc in every action — no shared helper. Services use **three dialects**: return an i18n key code (`matrixService`), return the full envelope with **hardcoded English** (`planService`: "An active plan already exists", "Plan not found" — bypasses i18n), or throw internal-English errors (`aiChatService`).
- **Unexpected errors**: only the three LLM actions have try/catch — a bare `catch {}` that **discards the error without logging** and substitutes a generic i18n message. Every other action lets DB/transaction/sync throws reject the client promise (prod: Next digest masking; dev: raw message).
- Good foundations to keep: DAL returns null/count-0 for not-found instead of throwing; `revalidatePath` runs strictly on success; the i18n `Errors` namespace already holds a small generic vocabulary (`generic`, `taskNotFound`, `generateFailed`, …).

### Client (components/hooks/stores)

- **Board/matrix quick ops** (drag between columns, mobile pull-to-todo, quadrant drag, Track This Week): optimistic patch → on returned `{error}` roll back + `console.error` — **nothing user-visible**, the card just snaps back.
- **Forms/overlays** (task modal, plan form, dump composer): await + local error string → `FormErrorAlert` (a filled daisyUI `alert alert-error` — visually foreign to the HUD language). The AI chat hand-rolls its own compact strip. `extractError` exists in **four divergent copies**; two fall back to `JSON.stringify(err)` (would render a raw object), and PlanForm ignores `fieldErrors` so a fieldErrors-only failure renders **nothing**.
- **No `.catch` anywhere**: a *rejected* action promise (network, unwrapped server throw) bypasses every error path — no rollback on the board, `isSubmitting` stuck true (wedged spinner) in task modal/plan form/dump composer, AI chat stuck at `initializing`/`generating` forever, dump pagination permanently dead (`isAppending` wedged), orphaned temp dump entry.
- **Auth is fully silent**: OAuth failure returns to the login button with zero feedback; the callback redirects errors to `/auth/login` with no query param; a rejected session check leaves the login page blank forever; sign-out ignores its error and navigates anyway.

### Pages

- **Zero error boundaries**: no `error.tsx`, `not-found.tsx`, or `global-error.tsx` anywhere. Any server-side throw (DAL read, `ensureSynced`'s write transactions) lands on Next's unstyled default error page with no app chrome; `notFound()` on the edit-plan page gets the browser-default 404.
- All four kanban segments have `loading.tsx` skeletons (daisyUI `skeleton` blocks under `animate-pulse`, mirroring real chrome) — the natural "before" state for a skeleton → error-screen swap.
- `ensureSynced` writes during GET renders of board/priorities/plans pages — a sync failure takes down the whole page render, so the page-level error screen is also the sync-failure surface.

### What can leak to the user today

Raw zod copy via `flatten()`; hardcoded English service strings; `JSON.stringify(err)` fallbacks in TaskModal/PlanForm; dev-mode raw server messages. Production server throws are digest-masked by Next — ugly but not leaky. Meanwhile the bare `catch {}` in the LLM actions means real failures are **never logged server-side** — the opposite of what we want (log everything internally, show nothing specific externally).

## Proposal — three surface patterns, one plumbing

**Principle: generic outward, specific inward.** Every failure shows one short, operation-scoped, i18n'd sentence ("Couldn't move the task, please try again.") chosen from a fixed vocabulary. The real error is logged server-side with context. No error object ever crosses the wire.

All three surfaces speak the existing **abort/error channel** in the tinted-token recipe already sanctioned by the success toast and `fx-chip` (`bg-error/10–15` + `border-error/30` + `text-error` + `fx-led`), replacing the filled `alert alert-error` block.

### Pattern A — auto-dismiss error toast (board & matrix quick ops)

For optimistic ops where the surface has no natural anchor and the state visibly rolls back: board drag/drop, mobile pull-to-todo, matrix reprioritize drag, Track This Week.

- Anatomy: fixed top-center pill (same position family as the existing success toast), `rounded-[10px] border-error/30 bg-error/15 text-error backdrop-blur-sm shadow-lg`, warning-triangle icon, message, ✕ dismiss.
- Auto-dismiss after ~5s (`ERROR_TOAST_DURATION_MS`, deliberately longer than the 2.5s success toast); hover/touch-hold pauses the timer; manual ✕ always available. A thin countdown bar telegraphs the dismissal.
- Both breakpoints (success toast is mobile-only today; errors must show on desktop too).
- One toast at a time — a newer error replaces the current one (these ops are serial in practice; a queue is overkill).
- Plumbing: a `toastStore` (Zustand, per-domain-store convention) + one `AppToaster` mounted in the application layer; the optimistic helpers push a toast in the same branch that currently calls `console.error`.

### Pattern B — in-surface inline alert (overlays & page forms)

For operations awaited inside an anchored surface: task modal (template create/edit, ad-hoc add), plan form submit + review-confirm, AI chat (init/generate/approve), dump composer, settings sign-out confirm, login sign-in.

- One shared `InlineErrorAlert` replaces `FormErrorAlert` and the AI chat's hand-rolled strip: tinted panel (`bg-error/10 border-error/30 rounded-[10px]`), `fx-led text-error` dot, message in `text-error text-sm` (`text-xs` compact variant for chat/confirm rows).
- Placement: directly above the surface's action row (task modal footer, plan form sticky bar, chat input, login button) so the error sits next to the retry affordance — the submit button *is* the retry.
- The AI chat init failure gets a real in-modal state (message + "Try again" button) instead of today's infinite `LoadingBubble`.
- Errors clear on the next attempt (already the convention); no auto-dismiss — the user is mid-task.

### Pattern C — page error screen (route fetch failures)

For server-side page data/sync failures: the skeleton (already shown by `loading.tsx`) swaps to a full error screen via per-segment `error.tsx`.

- Composition (fills the main area; sidebar/dock chrome survives because the root layout still renders): centered stack — error-tinted icon tile, mono micro-label ("SIGNAL LOST" voice via `fx-label`), title "Something went wrong", one generic body line ("We couldn't load this page — your data is safe."), primary **Try again** button wired to `error.tsx`'s `reset()`, secondary link back to the board. Error channel colors the *state*; the action button stays primary (action channel).
- Files to add: `error.tsx` under `kanban/`, `kanban/priorities/`, `kanban/dump/`, `kanban/plans/` (renders inside PlanChrome like the segment's skeleton), one shared `ErrorScreen` domain component behind them; `global-error.tsx` (root-layout failure — self-contained full-viewport variant); `not-found.tsx` (same composition, neutral/info voice, "Page not found", for the edit-plan 404).

### Flow → pattern map

| Flow (today's behavior) | Pattern |
| --- | --- |
| Board drag/drop, mobile pull-to-todo (silent rollback) | A |
| Matrix reprioritize drag, Track This Week (silent rollback) | A |
| Theme persist failure (silent; optimistic theme stays) | A (toast) — or keep silent; see Open questions |
| Task modal: template create/edit, ad-hoc add (FormErrorAlert) | B |
| Plan form create/update + review confirm (FormErrorAlert, gaps) | B |
| AI chat init/generate/approve (hand-rolled strip; init hangs) | B |
| Dump composer capture (FormErrorAlert) | B |
| Dump feed pagination (deliberately silent; wedges on throw) | stays silent on returned error; un-wedge + quiet retry on throw |
| Settings sign-out (silent, navigates anyway) | B (inline in confirm row; stop navigating on failure) |
| Login OAuth + callback failure (fully silent; blank page) | B (inline on login card; callback adds `?error=1`) |
| Page data/sync fetch: board, priorities, dump, plans (default Next error page) | C |
| Edit-plan not found (browser-default 404) | C (`not-found.tsx`) |

### Copy — i18n `Errors` extension (all generic, sentence case)

Existing keys stay (`generic`, `generateFailed`, `createFailed`, …). New, following the same "Couldn't …, please try again." voice: `moveFailed` (move the task), `trackFailed` (track the task), `reprioritizeFailed` (change the priority), `saveFailed`, `signInFailed`, `signOutFailed`, `aiInitFailed`; error screen: `screenTitle` ("Something went wrong"), `screenBody`, `tryAgain`, `notFoundTitle`/`notFoundBody`. Existing domain keys (`taskNotFound`, `noActivePlan`) remain the only "specific" copy — they describe *user-visible state*, never internals.

## Plumbing options

### Option A — error codes over the wire (recommended)

Actions return `ActionResult<T> = {data: T} | {error: {code: ErrorCode, fieldErrors?: Record<string, string[]>}}` where `ErrorCode` is a small union (`'generic' | 'taskNotFound' | 'noActivePlan' | 'activePlanExists' | 'planNotFound' | 'templateNotFound' | 'generateFailed' | 'createFailed' | 'validation'`). One server helper wraps every action body: validates, catches **all** throws, logs them with operation context (`console.error` server-side — sanctioned; later a real logger), and maps to a code. One client helper `runAction` wraps every call site: try/catches (killing the wedge class of bugs), translates `code` → `Errors.*` client-side, hands the message to toast/inline/screen. `fieldErrors` carry only schema-authored `Validation.*` copy; zod defaults collapse to `validation`.

**Pros**: typed, exhaustive `switch` on codes; copy lives in one place (client i18n) — no English crossing the wire, fixing planService's hardcoded strings by construction; trivially testable; the two `extractError` duplicates + two `JSON.stringify` leak branches all delete.
**Cons**: touches every action + call site (~16 actions, ~10 call sites); a migration, not a patch; codes must be kept in sync with the i18n namespace (a lint-able convention).

**Implementation plan**
1. `src/lib/actionResult.ts` (types + server `failure(code)`/`guard()` helper) + client `src/utils/errorMessages.ts` (code → i18n) + `runAction` wrapper; delete both `extractError` copies.
2. Migrate mutations action-by-action (board/matrix first — smallest envelopes), moving planService/aiChatService to code returns; add missing id-param validation while there; add server-side logging in every catch (the LLM actions' bare `catch {}` gains its log).
3. Pattern A: `toastStore` + `AppToaster` + wire the four optimistic helpers.
4. Pattern B: `InlineErrorAlert` + swap the five surfaces + AI-chat init error state + login/callback/sign-out surfaces.
5. Pattern C: `ErrorScreen` + four `error.tsx` + `global-error.tsx` + `not-found.tsx`.
6. Scenario/gallery updates per surface (error states become pinned fixtures), then delete the three mockups.

### Option B — server-translated messages everywhere (extend today's P2)

Keep `{error: {formErrors: [string]}}` but make it universal: every action gains try/catch + `getTranslations('Errors')`, services standardize on key returns, planService's hardcoded strings move to i18n, and client call sites get a shared `.catch`-ing runner that displays `result.error.formErrors[0]` or the generic fallback.

**Pros**: smaller diff — the envelope shape and half the actions already work this way; no client-side mapping layer.
**Cons**: copy decided at the server per call (strings, not types — no exhaustive handling; the same failure can produce different strings from different actions); server must know display language forever; string envelopes invite drift back toward today's four-dialect mess; the wedge-class client bugs still need the same client runner anyway — so most of Option A's cost is paid without its type safety.

**Implementation plan**: steps 3–6 identical to Option A; step 1–2 collapse into "add try/catch + i18n to every action, normalize services to keys". Roughly 60% of Option A's diff, same UI outcome, weaker foundation.

### Foundational fixes shared by both options

Regardless of plumbing choice: client runner with `.catch` on every call site (un-wedges spinners/status/pagination, restores rollback on rejection); delete `JSON.stringify(err)` fallbacks; log server-side in every catch; the Pattern B/C surface files; callback `?error=1`; sign-out stops navigating on failure.

## Open questions

- **Theme-persist failure**: toast it, or accept silent (session keeps the theme; only the cookie is lost)? Leaning silent — zero user cost, and a toast for a background cookie write feels alarmist.
- **Track-failure copy**: `trackFailed` generic vs surfacing the existing specific `noActivePlan` when that's the cause (it's user-actionable: create a plan). Leaning specific-when-user-actionable, generic otherwise — the mockup shows both.
- **Retry beyond reset()**: should Pattern A toasts offer an inline "Retry" action (re-fire the failed op)? V1 says no — the op is one gesture away; revisit if drag-retry friction shows up.
- Telemetry/observability (persisting client-side errors) is out of scope; server-side logging lands with this work, a real sink (e.g. Sentry) is a separate decision.
